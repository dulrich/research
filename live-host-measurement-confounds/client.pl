#!/usr/bin/perl
# Request client for one cv daemon (adapted from the public crucible-vault memory-release-strategy spike client):
# one pass of view_run over every configured view (+ optional searches) on one connection.
# Prints one line per request: kind index start_ms latency_ms reply_bytes ok|err (view ids are not printed).
# usage: client.pl <socket> <views|pipe|list> [nsearch]
use strict; use warnings; no warnings "once";
use IO::Socket::UNIX; use Time::HiRes qw(time); use JSON::PP;
my ($sock, $mode, $nsearch) = @ARGV; $nsearch //= 0;
my $s = IO::Socket::UNIX->new(Peer => $sock) or die "connect: $!";
my $id = 0;
sub call { my ($m, $p) = @_; $id++;
  my $t = time; $main::t0 = $t; print $s encode_json({jsonrpc=>"2.0", id=>$id, method=>$m, params=>$p}), "\n";
  while (my $l = <$s>) { next unless $l =~ /"id":$id\b/; return ((time-$t)*1000, length($l), ($l =~ /"error"/ ? "err" : "ok"), $l); }
  die "eof"; }
call("hello", {protocol_version=>1, client=>"lhmc"});
my (undef, undef, undef, $l) = call("views_list", undef);
my @v = @{decode_json($l)->{result}{view_ids}};
if ($mode eq "list") { print scalar(@v), "\n"; exit 0; }
if ($mode eq "pipe") { my (%t, %idx); my $n = 0;
  for my $v (@v) { $id++; $t{$id} = time; $idx{$id} = $n++; print $s encode_json({jsonrpc=>"2.0", id=>$id, method=>"view_run", params=>{view_id=>$v}}), "\n"; }
  while (%t and my $l = <$s>) { next unless $l =~ /"id":(\d+)\b/ and exists $t{$1}; my $k = $1;
    printf "view %d %.1f %d %s\n", $idx{$k}, (time-$t{$k})*1000, length($l), ($l =~ /"error"/ ? "err" : "ok"); delete $t{$k}; } }
else { my $n = 0;
  for my $v (@v) { my ($ms, $b, $ok) = call("view_run", {view_id=>$v}); printf "view %d %.1f %d %s\n", $n++, $ms, $b, $ok; } }
my @q = qw(project memory rust daemon search notes video weekly design review);
for my $k (0 .. $nsearch-1) { my ($ms, $b, $ok) = call("search", {query=>$q[$k % @q], limit=>20}); printf "search %d %.1f %d %s\n", $k, $ms, $b, $ok; }
