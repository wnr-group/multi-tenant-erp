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

  console.log("[welcome-sms] invoked", {
    recipients: recipients.length,
    schoolDomain,
    hasUrl: !!supabaseUrl,
    hasSecret: !!sharedSecret,
    secretLen: sharedSecret?.length ?? 0,
  });

  if (!supabaseUrl || !sharedSecret) {
    console.error("[welcome-sms] aborting — missing env", { hasUrl: !!supabaseUrl, hasSecret: !!sharedSecret });
    return;
  }

  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/send-welcome-sms`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-welcome-secret": sharedSecret,
      },
      body: JSON.stringify({ recipients, schoolDomain }),
    });
    const txt = await res.text();
    console.log("[welcome-sms] edge response:", res.status, txt);
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
