# The greeter pilot under Kani, run inside the `kani` Compose service:
#   docker compose run --rm kani make -f kani.mk all
# The pinned crates are staged from the mounted checkout's git objects into $(W) (a tmpfs), the
# harness crate kani/harness/ is copied next to them, the in-source harness diffs (cfg(kani)
# modules only) and, per mutant, one mutant diff are applied with `git apply --check` then
# `git apply`. Registry dependencies are fetched at run time into $(W) (network needed).
# Nothing is written to the mounted folders. `make -f kani.mk all` exits 0 only when every
# harness expected to pass reports `VERIFICATION:- SUCCESSFUL`, every mutant and the finding
# report `VERIFICATION:- FAILED` with the intended check among the failed checks, and every
# blocker still reproduces.

SHELL := /bin/sh
.ONESHELL:
.SILENT:

COMMIT := cd2df19e6eca85b282db8fddd29882abd83d78d1
W := /work
R := $(W)/results
GIT := git -c safe.directory=* --git-dir=/src/.git
STAGE_PATHS := crates/crucible-greetd crates/crucible-login Cargo.toml Cargo.lock
IN_SOURCE := c3-close-ranges c4-teardown
LIMIT := 600
export CARGO_TARGET_DIR := $(W)/target

# package:harness:expectation. `ok` = VERIFICATION:- SUCCESSFUL; `fail:<check>` = FAILED with a
# failed check containing <check> (a dot stands for a space); `block:<pattern>` = the output
# contains <pattern> (a blocker reproduction).
G := kani-greeter-harness
L := crucible-login
HARNESSES := \
  $(G):c1_reject_above_cap:ok \
  $(G):c1_accept_within_cap:ok \
  $(G):c1_concrete_frame_decodes:ok \
  $(G):c2_machine_safety:ok \
  $(L):c3_close_ranges:ok \
  $(L):c4_teardown_for:ok \
  $(G):c1_writer_reader_agree:fail:every.length.the.writer.emits.is.accepted \
  $(L):c4_serve_needs_pam:block:pam_start
# mutant:package:harness:check (each diff applies to the pinned source).
MUTANTS := \
  c1-cap-removed:$(G):c1_reject_above_cap:refused.as.TooLarge \
  c1-cap-off-by-one:$(G):c1_accept_within_cap:within.the.cap.is.accepted \
  c2-start-session-from-prompt:$(G):c2_machine_safety:StartSession.only.from.Authenticating \
  c2-starting-on-auth-message:$(G):c2_machine_safety:Starting.is.entered.only \
  c3-range-off-by-one:$(L):c3_close_ranges:kept.descriptor.are.never.closed \
  c4-teardown-cred-kept:$(L):c4_teardown_for:delete_cred.exactly

.PHONY: all pin harnesses mutants

all:
	rm -rf $(W)/s $(R); mkdir -p $(R); : > $(R)/summary
	$(MAKE) --no-print-directory -f kani.mk pin harnesses mutants
	echo; echo "==== summary ($$(cargo kani --version 2>/dev/null | head -n 1))"; cat $(R)/summary
	echo "==== $$(grep -c '^PASS' $(R)/summary) pass, $$(grep -c '^FAIL' $(R)/summary) fail"
	! grep -q '^FAIL' $(R)/summary

pin:
	full=$$($(GIT) rev-parse --verify $(COMMIT)^{commit} 2>&1)
	if [ "$$full" = "$(COMMIT)" ]; then echo "PASS pin $$full" >> $(R)/summary
	else echo "FAIL pin $$full" >> $(R)/summary; fi

# $(call stage,dir,extra diff or empty): pinned bytes, harness crate, in-source diffs, extra diff.
define stage
	rm -rf $(1); mkdir -p $(1)
	$(GIT) archive $(COMMIT) $(STAGE_PATHS) | tar -x -C $(1)
	cp -r /pilot/kani/harness $(1)/crates/kani-harness
	ok=1
	for df in $(foreach d,$(IN_SOURCE),/pilot/kani/in-source/$(d).diff) $(2); do
	  ( cd $(1) && git apply --check $$df && git apply $$df ) >> $(R)/apply.log 2>&1 || { ok=0; echo "FAIL apply $$df into $(1)" >> $(R)/summary; }
	done
endef

# $(call kani,dir,package,harness,label,expectation)
define kani
	( cd $(1) && timeout $(LIMIT) cargo kani -Z stubbing -p $(2) --harness $(3) ) > $(R)/$(4).log 2>&1; rc=$$?
	line=$$(grep -E '^VERIFICATION:-' $(R)/$(4).log | tail -n 1)
	exp="$(5)"
	case "$$exp" in
	ok) if [ $$rc -eq 0 ] && [ "$$line" = "VERIFICATION:- SUCCESSFUL" ]; then st=PASS; else st=FAIL; fi ;;
	fail:*) pat=$$(echo "$${exp#fail:}" | tr '.' ' ')
	  if [ "$$line" = "VERIFICATION:- FAILED" ] && sed -n '/^Failed Checks:/p' $(R)/$(4).log | grep -q "$$pat"; then st=PASS; else st=FAIL; fi ;;
	block:*) pat=$$(echo "$${exp#block:}" | tr '.' ' ')
	  if [ $$rc -ne 0 ] && grep -q "$$pat" $(R)/$(4).log; then st=PASS; else st=FAIL; fi ;;
	esac
	[ $$rc -eq 124 ] && line="did not finish within $(LIMIT) s"
	echo "$$st $(4) [expect $(5)] rc=$$rc $${line:-no VERIFICATION line}" >> $(R)/summary
	echo "---- $(4): $$st"; grep -E '^(VERIFICATION|Failed Checks|error)|Verification Time|pam_start' $(R)/$(4).log | sort -u | head -n 8
endef

harnesses:
	$(call stage,$(W)/s/real,)
	for spec in $(HARNESSES); do
	  p=$${spec%%:*}; rest=$${spec#*:}; h=$${rest%%:*}; e=$${rest#*:}
	  $(call kani,$(W)/s/real,$$p,$$h,$$h,$$e)
	done

mutants:
	for spec in $(MUTANTS); do
	  n=$${spec%%:*}; rest=$${spec#*:}; p=$${rest%%:*}; rest=$${rest#*:}; h=$${rest%%:*}; c=$${rest#*:}
	  $(call stage,$(W)/s/$$n,/pilot/kani/mutants/$$n.diff)
	  if [ $$ok -eq 1 ]; then $(call kani,$(W)/s/$$n,$$p,$$h,mutant-$$n,fail:$$c)
	  else echo "FAIL mutant-$$n: diff does not apply" >> $(R)/summary; fi
	done
