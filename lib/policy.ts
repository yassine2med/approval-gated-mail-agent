/**
 * First-release policy: a reply may only go to the original sender of the
 * message being replied to. No CC/BCC expansion, no arbitrary recipients —
 * this bounds the blast radius of a compromised or misclassified draft.
 */
export function isAllowedRecipient(address: string, context: { originalSenderAddress: string }): boolean {
  return address.trim().toLowerCase() === context.originalSenderAddress.trim().toLowerCase()
}
