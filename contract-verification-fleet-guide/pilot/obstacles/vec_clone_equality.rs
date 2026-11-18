// Minimal reproduction: after `Vec::clone`, Verus proves equality of the views (`r@ == v@`)
// but not equality of the vectors (`r == *v`).
use vstd::prelude::*;

verus! {

fn clone_view_eq(v: &Vec<String>) -> (r: Vec<String>)
    ensures r@ == v@,
{
    v.clone()
}

fn clone_eq(v: &Vec<String>) -> (r: Vec<String>)
    ensures r == *v,
{
    v.clone()
}

fn clone_eq_bytes(v: &Vec<u8>) -> (r: Vec<u8>)
    ensures r == *v,
{
    v.clone()
}

fn main() {}
}
