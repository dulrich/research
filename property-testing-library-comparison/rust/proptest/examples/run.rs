//! One seeded run of one property; prints a single JSON line on stdout.
//! usage: run <property> <seed> <cases>
use ptlc_proptest::{Prop, run, LIBRARY};

fn esc(s: &str) -> String {
    let mut o = String::from("\"");
    for c in s.chars() {
        match c {
            '"' => o.push_str("\\\""),
            '\\' => o.push_str("\\\\"),
            c if (c as u32) < 0x20 => o.push_str(&format!("\\u{:04x}", c as u32)),
            c => o.push(c),
        }
    }
    o.push('"');
    o
}

fn main() {
    let a: Vec<String> = std::env::args().skip(1).collect();
    if a.len() != 3 {
        eprintln!("usage: run <property> <seed> <cases>");
        std::process::exit(2);
    }
    let prop = Prop::parse(&a[0]).unwrap_or_else(|| { eprintln!("unknown property {}", a[0]); std::process::exit(2) });
    let seed: u64 = a[1].parse().expect("seed");
    let cases: u64 = a[2].parse().expect("cases");
    let o = run(prop, seed, cases);
    let opt = |v: Option<String>| v.unwrap_or_else(|| "null".into());
    println!("MEASURE run_ms {:.1} ms", o.total_ms);
    println!(
        "{{\"library\":{},\"property\":{},\"seed\":{},\"cases\":{},\"status\":{},\"cases_to_first_failure\":{},\"counterexample\":{},\"shrink_ms\":{},\"total_ms\":{:.1},\"detail\":{}}}",
        esc(LIBRARY), esc(prop.name()), seed, cases, esc(o.status),
        opt(o.cases_to_first_failure.map(|n| n.to_string())),
        opt(o.counterexample.as_deref().map(esc)),
        opt(o.shrink_ms.map(|m| format!("{m:.1}"))),
        o.total_ms, esc(&o.detail.chars().take(300).collect::<String>())
    );
}
