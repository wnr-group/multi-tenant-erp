export interface WelcomeRecipient {
  phone: string;
  parentName: string;
  studentName: string;
}

export async function sendParentWelcomeSmsBatch(
  recipients: WelcomeRecipient[],
  schoolDomain: string,
): Promise<void> {
  if (recipients.length === 0) return;

  const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const sharedSecret = process.env.WELCOME_SMS_SECRET;
  if (!supabaseUrl || !sharedSecret) return;

  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/send-welcome-sms`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-welcome-secret": sharedSecret,
      },
      body: JSON.stringify({ recipients, schoolDomain }),
    });
    if (!res.ok) {
      const txt = await res.text();
      console.error("[welcome-sms] edge function returned error:", res.status, txt);
    }
  } catch (err) {
    console.error("[welcome-sms] failed to invoke edge function:", err);
  }
}

export async function sendParentWelcomeSms(
  phone: string,
  parentName: string,
  studentName: string,
  schoolDomain: string,
): Promise<void> {
  await sendParentWelcomeSmsBatch([{ phone, parentName, studentName }], schoolDomain);
}
