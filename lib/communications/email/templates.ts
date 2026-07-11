export type EmailTemplate = {
  subject: string;
  html: string;
  text: string;
};

export interface ChurchBranding {
  churchName: string;
  logoUrl?: string;
  primaryColor?: string;
}

function shell(
  branding: ChurchBranding,
  title: string,
  body: string,
  footer?: string,
): string {
  const footerContent = footer !== undefined
    ? footer
    : `Sent by ${branding.churchName} using Shepherd Kids`;
  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
</head>

<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0">
<tr>
<td align="center">

<table
width="640"
cellpadding="0"
cellspacing="0"
style="
background:#ffffff;
margin:40px 0;
border-radius:10px;
overflow:hidden;
">

<tr>
<td
style="
background:${branding.primaryColor ?? "#7B2CBF"};
padding:24px;
text-align:center;
color:white;
font-size:28px;
font-weight:bold;
">
${branding.logoUrl ? `<img src="${branding.logoUrl}" style="max-height:80px;"><br><br>` : ""}
${branding.churchName}
</td>
</tr>

<tr>
<td style="padding:40px;">

<h2 style="margin-top:0;">
${title}
</h2>

${body}

</td>
</tr>

${footerContent ? `
<tr>
<td
style="
background:#F2F2F2;
padding:20px;
font-size:12px;
color:#666;
text-align:center;
">
${footerContent}
</td>
</tr>
` : ""}

</table>

</td>
</tr>
</table>

</body>
</html>
`;
}

export function buildCertificateEmail({
  childName,
  certTypeLabel,
  churchName,
  churchLogoUrl,
  ministerName,
  ministerTitle,
  familyGreeting,
}: {
  childName: string;
  certTypeLabel: string;
  churchName: string;
  churchLogoUrl?: string;
  ministerName?: string;
  ministerTitle?: string;
  familyGreeting?: string;
}): EmailTemplate {
  const subject = `A Special Certificate for ${childName} from ${churchName}`;

  const branding: ChurchBranding = {
    churchName,
    logoUrl: churchLogoUrl,
    primaryColor: "#7B2CBF",
  };

  const greeting = familyGreeting ?? "Parent";
  const closingName = ministerName ?? "Your Children's Ministry Team";

  const html = shell(
    branding,
    `A Special Certificate for ${childName}`,
    `
<p>Dear ${greeting},</p>

<p>
We are grateful for the opportunity to recognize this special milestone in ${childName}'s life.
</p>

<p>
Attached is ${childName}'s ${certTypeLabel}. We hope this certificate will serve as a meaningful reminder of God's work and encouragement in the years ahead.
</p>

<p>
Thank you for allowing us to partner with your family as we care for and encourage ${childName}.
</p>

<p style="margin-top:28px;">
Blessings,<br /><br />
<strong>${closingName}</strong>${ministerTitle ? `<br />${ministerTitle}` : ""}<br />
${churchName}<br />
Children's Ministry
</p>
`,
    churchName,
  );

  return {
    subject,
    html,
    text: `${churchName}

Dear ${greeting},

We are grateful for the opportunity to recognize this special milestone in ${childName}'s life.

Attached is ${childName}'s ${certTypeLabel}. We hope this certificate will serve as a meaningful reminder of God's work and encouragement in the years ahead.

Thank you for allowing us to partner with your family as we care for and encourage ${childName}.

Blessings,

${closingName}${ministerTitle ? `\n${ministerTitle}` : ""}
${churchName}
Children's Ministry`,
  };
}

export function buildTestEmail(
  branding: ChurchBranding
): EmailTemplate {

  const subject = `${branding.churchName} Email Test`;

  const html = shell(
    branding,
    "Email Successfully Configured",
    `
<p>Congratulations!</p>

<p>Your Shepherd Kids email system is now working correctly.</p>

<p>
You are ready to send:
</p>

<ul>
<li>Parent Communication</li>
<li>Certificates</li>
<li>Birthday Emails</li>
<li>Spiritual Birthday Emails</li>
<li>Visitor Follow-up</li>
</ul>

<p>
No further configuration is required.
</p>
`
  );

  return {
    subject,
    html,
    text:
`${branding.churchName}

Congratulations!

Your Shepherd Kids email system has been configured successfully.`,
  };
}