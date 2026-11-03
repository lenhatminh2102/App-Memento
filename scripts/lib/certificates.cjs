function certificateDigests(output) {
  return [
    ...new Set(
      [...output.matchAll(/certificate SHA-256 digest:\s*([a-f\d]{64})/gi)].map((match) =>
        match[1].toLowerCase(),
      ),
    ),
  ];
}

function assertCertificate(output, expected) {
  const digests = certificateDigests(output);
  if (digests.length !== 1 || digests[0] !== expected.toLowerCase())
    throw new Error('APK release certificate mismatch');
}

module.exports = { certificateDigests, assertCertificate };
