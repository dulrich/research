//! One seeded run; prints a single JSON line on stdout.
//! usage: run <seed> <cases>
fn main() {
    let a: Vec<String> = std::env::args().skip(1).collect();
    if a.len() != 2 {
        eprintln!("usage: run <seed> <cases>");
        std::process::exit(2);
    }
    let seed: u64 = a[0].parse().expect("seed");
    let cases: u64 = a[1].parse().expect("cases");
    println!("{}", spt_proptest::run(seed, cases));
}
