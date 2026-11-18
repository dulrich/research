// C1 verification twin: greetd frame length bound and framing.
//
// Real anchor (crucible-dev-env at cd2df19): crates/crucible-greetd/src/codec.rs:152 `read_message`,
// with :142 `write_message` and the cap `MAX_MESSAGE_LEN` at :10.
//
// Differences from the real code:
// - The stream is a byte vector with a read position (`Stream`), not a generic `R: Read`;
//   `read_exact` is a twin that copies bytes out of it and fails with `Io` when too few remain
//   (the real `read_exact` may also fail for other I/O reasons; that is not modelled).
// - The 4-byte prefix is decoded little-endian by arithmetic, standing for
//   `u32::from_ne_bytes` on the x86-64 target (native order is little-endian there).
// - The real header is a stack array `[0u8; 4]`; the twin reads it into a vector. Allocation is
//   tracked only for the body: a ghost entry is pushed where the real code runs `vec![0u8; len]`.
// - The JSON decode (`serde_json::from_slice`) is cut: the twin returns the body bytes.
// - `CodecError` keeps only `Io` and `TooLarge`; `Malformed` belongs to the cut decode.
// - `write_message` is represented only by the frame it emits (`frame`) and its acceptance test
//   (`write_accepts`: the body length fits `u32`); serialisation and the writes are not modelled.
use vstd::prelude::*;

verus! {

pub const MAX_MESSAGE_LEN: usize = 64 * 1024;

pub enum CodecError { Io, TooLarge(usize) }

/// The byte stream: what is left to read, plus ghost logs of read requests and allocations.
pub struct Stream {
    pub data: Vec<u8>,
    pub pos: usize,
    pub reads: Ghost<Seq<nat>>,
    pub allocs: Ghost<Seq<nat>>,
}

pub open spec fn prefix_len(h: Seq<u8>) -> nat {
    (h[0] as nat) + (h[1] as nat) * 256 + (h[2] as nat) * 65536 + (h[3] as nat) * 16777216
}

/// The reader as a function of the bytes: Ok(body) or which error.
pub open spec fn read_spec(d: Seq<u8>) -> Result<Seq<u8>, CodecError> {
    if d.len() < 4 { Err(CodecError::Io) }
    else if prefix_len(d.subrange(0, 4)) > MAX_MESSAGE_LEN { Err(CodecError::TooLarge(prefix_len(d.subrange(0, 4)) as usize)) }
    else if d.len() < 4 + prefix_len(d.subrange(0, 4)) { Err(CodecError::Io) }
    else { Ok(d.subrange(4, 4 + prefix_len(d.subrange(0, 4)) as int)) }
}

/// Twin of `Read::read_exact` into a fresh buffer of `n` bytes.
fn read_exact(s: &mut Stream, n: usize) -> (r: Result<Vec<u8>, CodecError>)
    requires old(s).pos <= old(s).data.len(),
    ensures
        final(s).data == old(s).data,
        final(s).reads@ == old(s).reads@.push(n as nat),
        final(s).allocs == old(s).allocs,
        final(s).pos <= final(s).data.len(),
        match r {
            Ok(v) => old(s).pos + n <= old(s).data.len() && v@ == old(s).data@.subrange(old(s).pos as int, old(s).pos + n) && final(s).pos == old(s).pos + n,
            Err(e) => e is Io && old(s).pos + n > old(s).data.len(),
        },
{
    s.reads = Ghost(s.reads@.push(n as nat));
    if n > s.data.len() - s.pos {
        s.pos = s.data.len();
        return Err(CodecError::Io);
    }
    let mut v: Vec<u8> = Vec::new();
    let start = s.pos;
    let mut i: usize = 0;
    while i < n
        invariant
            i <= n, start + n <= s.data.len(), s.pos == start,
            v@ == s.data@.subrange(start as int, start + i),
        decreases n - i,
    {
        v.push(s.data[start + i]);
        i = i + 1;
    }
    s.pos = start + n;
    Ok(v)
}

/// Twin of `codec.rs` `read_message`, with the JSON decode cut: returns the body bytes.
pub fn read_message(s: &mut Stream) -> (r: Result<Vec<u8>, CodecError>)
    requires old(s).pos == 0, old(s).reads@.len() == 0, old(s).allocs@.len() == 0,
    ensures
        match r {
            Ok(b) => read_spec(old(s).data@) == Ok::<Seq<u8>, CodecError>(b@),
            Err(CodecError::TooLarge(l)) => read_spec(old(s).data@) == Err::<Seq<u8>, CodecError>(CodecError::TooLarge(l)),
            Err(CodecError::Io) => read_spec(old(s).data@) is Err,
        },
        // Accepted exactly when the prefix is at most the cap; an accepted length is the body read.
        old(s).data.len() >= 4 ==> (
            prefix_len(old(s).data@.subrange(0, 4)) <= MAX_MESSAGE_LEN
                <==> final(s).reads@.len() == 2),
        final(s).reads@.len() == 2 ==> final(s).reads@[1] == prefix_len(old(s).data@.subrange(0, 4)),
        // On rejection by the cap: only the 4-byte header was requested or allocated.
        r matches Err(CodecError::TooLarge(_)) ==> final(s).reads@ =~= seq![4nat] && final(s).allocs@.len() == 0,
{
    let head = read_exact(s, 4)?;
    let len = (head[0] as u32 + head[1] as u32 * 256 + head[2] as u32 * 65536 + head[3] as u32 * 16777216) as usize;
    assert(head@ == old(s).data@.subrange(0, 4));
    if len > MAX_MESSAGE_LEN {
        return Err(CodecError::TooLarge(len));
    }
    s.allocs = Ghost(s.allocs@.push(len as nat)); // `vec![0u8; len]`
    let body = read_exact(s, len)?;
    assert(old(s).data@.subrange(4, 4 + len as int) =~= body@);
    Ok(body)
}


pub open spec fn le4(n: nat) -> Seq<u8> {
    seq![(n % 256) as u8, ((n / 256) % 256) as u8, ((n / 65536) % 256) as u8, ((n / 16777216) % 256) as u8]
}

/// The frame `write_message` emits for a body it accepts (length fits `u32`).
pub open spec fn frame(body: Seq<u8>) -> Seq<u8> { le4(body.len()) + body }

pub open spec fn write_accepts(body: Seq<u8>) -> bool { body.len() <= u32::MAX }

proof fn lemma_le4(n: nat)
    requires n <= u32::MAX,
    ensures prefix_len(le4(n)) == n,
{
    assert(n == (n % 256) + ((n / 256) % 256) * 256 + ((n / 65536) % 256) * 65536 + ((n / 16777216) % 256) * 16777216) by (nonlinear_arith)
        requires n <= u32::MAX;
}

/// Within the cap the writer and the reader agree.
proof fn writer_reader_agree_within_cap(body: Seq<u8>)
    requires body.len() <= MAX_MESSAGE_LEN,
    ensures read_spec(frame(body)) == Ok::<Seq<u8>, CodecError>(body),
{
    lemma_le4(body.len());
    assert(frame(body).subrange(0, 4) =~= le4(body.len()));
    assert(frame(body).subrange(4, 4 + body.len() as int) =~= body);
}

/// Above the cap the reader refuses what the writer accepted.
proof fn writer_reader_disagree_above_cap(body: Seq<u8>)
    requires write_accepts(body), body.len() > MAX_MESSAGE_LEN,
    ensures read_spec(frame(body)) is Err,
{
    lemma_le4(body.len());
    assert(frame(body).subrange(0, 4) =~= le4(body.len()));
}

fn main() {}
}
