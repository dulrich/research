# hbytes.pl: runs with -I<scripts clone>/util/cache-prune/perl. Prints one line of key=value facts.
use strict; use warnings;
use CachePrune::DockerResidue;
my $h = \&CachePrune::DockerResidue::hbytes;
my @big = map { "$_=" . ($h->($_) // 'undef') } ('9007199254740993B', '9007199254740993kB', '9007199254740993', '1.001kB');
my %mult = (kB => 1000, MB => 1000000, GB => 1000000000);
my ($total, $low, $other, $first) = (0, 0, 0, '');
for my $w (0 .. 99) {
    for my $f (0 .. 999) {
        for my $u (qw(kB MB GB)) {
            my $tok = sprintf('%d.%03d%s', $w, $f, $u);
            my $exact = ($w * 1000 + $f) * ($mult{$u} / 1000);   # integer: exact
            my $got = $h->($tok);
            $total++;
            if (!defined $got || $got == $exact) { $other++ if !defined $got; next; }
            if ($got == $exact - 1) { $low++; $first ||= "$tok=$got(exact $exact)"; } else { $other++; }
        }
    }
}
print "BIG ", join(' ', @big), "\n";
print "ENUM total=$total one_low=$low other_mismatch_or_undef=$other first=$first\n";
