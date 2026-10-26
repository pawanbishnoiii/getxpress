export type OnboardingInput = { full_name: string; gender: string; age: number; address: string; pincode: string };

/** Returns an error message, or null when the profile can be saved. */
export function validateOnboarding(i: OnboardingInput): string | null {
  if (i.full_name.trim().length < 2) return "Enter your full name.";
  if (!["female", "male", "other"].includes(i.gender)) return "Select your gender.";
  if (!Number.isInteger(i.age) || i.age < 13 || i.age > 100) return "Age must be between 13 and 100.";
  if (!/^\d{6}$/.test(i.pincode)) return "Enter a 6-digit pincode.";
  if (i.address.trim().length < 8) return "Enter your full address.";
  return null;
}
