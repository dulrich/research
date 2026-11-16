# ts.pl: runs with -I<scripts clone>/util/cache-prune/perl. Prints one "TS <date> <epoch|error>" line per input.
use strict; use warnings;
use CachePrune::DockerResidue;
for my $d (qw(2023-02-28 2023-02-29 2023-02-30 2023-03-01 2023-03-02 2023-04-30 2023-04-31 2023-05-01)) {
    my $r = eval { CachePrune::DockerResidue::ts("${d}T00:00:00Z") };
    print "TS $d ", defined $r ? $r : ($@ ? "error" : "undef"), "\n";
}
