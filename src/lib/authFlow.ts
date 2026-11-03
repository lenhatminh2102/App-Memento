// Account verification also uses recovery OTPs, but must not open password recovery UI.
let accountVerifications = 0;

export function isVerifyingAccountAction() {
  return accountVerifications > 0;
}

export async function withAccountVerification<T>(action: () => Promise<T>): Promise<T> {
  accountVerifications++;
  try {
    return await action();
  } finally {
    accountVerifications--;
  }
}
