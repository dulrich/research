// Obstacle reproduction (C1 on the real source): `read_message` is generic over `R: Read` and
// calls `Read::read_exact`, which vstd gives no specification. The body below is the real one
// with the JSON decode cut (crucible-dev-env at cd2df19, crates/crucible-greetd/src/codec.rs:152).
use std::io::{self, Read};
use vstd::prelude::*;

#[verus_verify]
pub const MAX_MESSAGE_LEN: usize = 64 * 1024;

#[verus_verify]
pub enum CodecError {
    Io(io::Error),
    TooLarge(usize),
}

// Stands for the `#[from]` conversion `thiserror` derives in the real code.
#[verus_verify]
impl From<io::Error> for CodecError {
    fn from(e: io::Error) -> Self {
        CodecError::Io(e)
    }
}

#[verus_spec(res =>
    ensures res matches Ok(b) ==> b@.len() <= MAX_MESSAGE_LEN,
)]
pub fn read_message<R: Read>(r: &mut R) -> Result<Vec<u8>, CodecError> {
    let mut head = [0u8; 4];
    r.read_exact(&mut head)?;
    let len = u32::from_ne_bytes(head) as usize;
    if len > MAX_MESSAGE_LEN {
        return Err(CodecError::TooLarge(len));
    }
    let mut body = vec![0u8; len];
    r.read_exact(&mut body)?;
    Ok(body)
}

fn main() {}
