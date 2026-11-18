# The greeter pilot, run inside the `verus` Compose service:
#   docker compose run --rm verus make all
# Every result is written under $(W) (a tmpfs in the container) and printed; nothing is written to
# the mounted folders. `make all` exits 0 only when every twin and in-source contract verifies,
# every mutant and the finding are rejected with the expected verifier error (a rejection counts
# only if the verifier got as far as printing its results line), and every obstacle reproduces.

SHELL := /bin/sh
.ONESHELL:
.SILENT:

COMMIT := cd2df19e6eca85b282db8fddd29882abd83d78d1
W := /work
R := $(W)/results
GIT := git -c safe.directory=* --git-dir=/src/.git
STAGE_PATHS := crates/crucible-greetd crates/crucible-login Cargo.toml Cargo.lock

TWINS := c1_codec c2_machine c3_close_ranges c4_worker
IN_SOURCE := c2-machine c3-close-ranges
# name:expected verifier error (a dot stands for a space). Names starting `twin-` are diffs
# against twins/; `c2-` and `c3-` names are diffs against the patched in-source copy.
MUTANTS := \
  twin-c1-cap-removed:postcondition.not.satisfied \
  twin-c1-cap-off-by-one:postcondition.not.satisfied \
  twin-c2-starting-on-auth-message:postcondition.not.satisfied \
  twin-c2-start-session-from-prompt:postcondition.not.satisfied \
  twin-c3-range-off-by-one:postcondition.not.satisfied \
  twin-c4-spawn-before-open:postcondition.not.satisfied \
  c2-starting-on-auth-message:postcondition.not.satisfied \
  c2-start-session-from-prompt:postcondition.not.satisfied \
  c3-range-off-by-one:postcondition.not.satisfied
FINDINGS := c1-writer-reader-as-written:postcondition.not.satisfied
# file:expected error. These stop before verification or fail an assertion on purpose.
OBSTACLES := \
  read_message_generic_reader:std::io::Read::read_exact \
  derived_clone_no_spec:assertion.failed \
  private_field_in_public_contract:field.expression.for.an.opaque.datatype \
  vec_clone_equality:2.verified,.2.errors

.PHONY: all pin twins in-source mutants findings obstacles

all:
	rm -rf $(W)/s $(W)/m $(R); mkdir -p $(R); : > $(R)/summary
	$(MAKE) --no-print-directory pin twins in-source mutants findings obstacles
	echo; echo "==== summary (verus $$(verus --version 2>/dev/null | sed -n "s/ *Version: //p"))"; cat $(R)/summary
	echo "==== $$(grep -c '^PASS' $(R)/summary) pass, $$(grep -c '^FAIL' $(R)/summary) fail"
	! grep -q '^FAIL' $(R)/summary

# Records what the mounted checkout's objects resolve the pin to.
pin:
	full=$$($(GIT) rev-parse --verify $(COMMIT)^{commit} 2>&1)
	if [ "$$full" = "$(COMMIT)" ]; then echo "PASS pin $$full" >> $(R)/summary
	else echo "FAIL pin $$full" >> $(R)/summary; fi

# $(call verify,dir,file,name,expect): runs Verus and records PASS/FAIL against `expect`
# (`verified`, or a pattern the output must contain; `reject:` also needs the results line).
define verify
	( cd $(1) && verus $(2) ) > $(R)/$(3).log 2>&1; rc=$$?
	line=$$(grep 'verification results::' $(R)/$(3).log | tail -n 1)
	case "$(4)" in
	verified) if [ $$rc -eq 0 ] && echo "$$line" | grep -q ' 0 errors'; then st=PASS; else st=FAIL; fi ;;
	reject:*) pat=$$(echo "$(4)" | sed 's/^reject://'); if [ $$rc -ne 0 ] && [ -n "$$line" ] && grep -q "$$pat" $(R)/$(3).log; then st=PASS; else st=FAIL; fi ;;
	error:*) pat=$$(echo "$(4)" | sed 's/^error://'); if [ $$rc -ne 0 ] && grep -q "$$pat" $(R)/$(3).log; then st=PASS; else st=FAIL; fi ;;
	esac
	echo "$$st $(3) [expect $(4)] rc=$$rc $${line:-no results line}" >> $(R)/summary
	echo "---- $(3): $$st"; grep -E '^(error|verification results)' $(R)/$(3).log | head -n 8
endef

# $(call stage,dir,in-source diff): the pinned bytes from the git objects, then the diff.
define stage
	rm -rf $(1); mkdir -p $(1)
	$(GIT) archive $(COMMIT) $(STAGE_PATHS) | tar -x -C $(1)
	( cd $(1) && git apply --check /pilot/in-source/$(2).diff && git apply /pilot/in-source/$(2).diff ) > $(R)/apply-$(2).log 2>&1 \
	  || echo "FAIL apply in-source/$(2).diff into $(1)" >> $(R)/summary
endef

# $(call harness,dir,contract): writes $(1)/harness.rs for the in-source contract.
define harness
	case "$(2)" in
	c2-machine) cp /pilot/harness/c2_in_source.rs $(1)/harness.rs ;;
	c3-close-ranges) { cat /pilot/harness/c3_prelude.rs; \
	  sed -n '/verus-extract-begin/,/verus-extract-end/p' $(1)/crates/crucible-login/src/worker/spawn.rs; \
	  echo 'fn main() {}'; } > $(1)/harness.rs ;;
	esac
endef

twins:
	for t in $(TWINS); do
	  $(call verify,/pilot/twins,$$t.rs,twin-$$t,verified)
	done

in-source:
	for c in $(IN_SOURCE); do
	  $(call stage,$(W)/s/$$c,$$c)
	  $(call harness,$(W)/s/$$c,$$c)
	  $(call verify,$(W)/s/$$c,harness.rs,in-source-$$c,verified)
	done

mutants:
	for spec in $(MUTANTS); do
	  n=$${spec%%:*}; pat=$$(echo "$${spec#*:}" | tr '.' ' ')
	  d=$(W)/m/$$n
	  case $$n in
	  twin-*) rm -rf $$d; mkdir -p $$d; cp -r /pilot/twins $$d/
	    target=$$(sed -n 's|^+++ b/||p' /pilot/mutants/$$n.diff) ;;
	  c2-*) c=c2-machine ;;
	  c3-*) c=c3-close-ranges ;;
	  esac
	  case $$n in c*) $(call stage,$$d,$$c) ;; esac
	  if ( cd $$d && git apply --check /pilot/mutants/$$n.diff && git apply /pilot/mutants/$$n.diff ) > $(R)/apply-$$n.log 2>&1; then
	    case $$n in c*) $(call harness,$$d,$$c); target=harness.rs ;; esac
	    $(call verify,$$d,$$target,mutant-$$n,reject:$$pat)
	  else echo "FAIL mutant-$$n: diff does not apply" >> $(R)/summary; fi
	done

findings:
	for spec in $(FINDINGS); do
	  n=$${spec%%:*}; pat=$$(echo "$${spec#*:}" | tr '.' ' ')
	  d=$(W)/m/$$n; rm -rf $$d; mkdir -p $$d; cp -r /pilot/twins $$d/
	  target=$$(sed -n 's|^+++ b/||p' /pilot/findings/$$n.diff)
	  if ( cd $$d && git apply --check /pilot/findings/$$n.diff && git apply /pilot/findings/$$n.diff ) > $(R)/apply-$$n.log 2>&1; then
	    $(call verify,$$d,$$target,finding-$$n,reject:$$pat)
	  else echo "FAIL finding-$$n: diff does not apply" >> $(R)/summary; fi
	done

obstacles:
	for spec in $(OBSTACLES); do
	  n=$${spec%%:*}; pat=$$(echo "$${spec#*:}" | tr '.' ' ')
	  $(call verify,/pilot/obstacles,$$n.rs,obstacle-$$n,error:$$pat)
	done
