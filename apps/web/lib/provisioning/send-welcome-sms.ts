export async function sendParentWelcomeSms(
  phone: string,
  parentName: string,
  studentName: string,
  schoolDomain: string,
): Promise<void> {
  const user     = process.env.NETTYFISH_USER;
  const password = process.env.NETTYFISH_PASSWORD;
  const senderId = process.env.NETTYFISH_SENDER_ID;
  const channel  = process.env.NETTYFISH_CHANNEL ?? "Trans";
  const route    = process.env.NETTYFISH_ROUTE ?? "4";

  if (!user || !password || !senderId) return;

  const appLink = `${schoolDomain}.connectmyskool.com/download-app`;
  const number  = phone.replace(/^\+/, "");
  const text    = `Dear ${parentName}, Welcome to ConnectMySkool. Your child ${studentName} has been registered on the platform. Download the app and stay connected with school updates: ${appLink} Thank you, CMYSKL`;

  const params = new URLSearchParams({ user, password, senderid: senderId, channel, DCS: "0", flashsms: "0", number, text, route });

  try {
    const res    = await fetch(`http://retailsms.nettyfish.com/api/mt/SendSMS?${params}`);
    const result = await res.json() as { ErrorCode?: string; ErrorMessage?: string };
    if (result.ErrorCode !== "000") {
      console.error("[welcome-sms] Nettyfish error:", result.ErrorMessage);
    }
  } catch (err) {
    console.error("[welcome-sms] SMS send failed:", err);
  }
}
