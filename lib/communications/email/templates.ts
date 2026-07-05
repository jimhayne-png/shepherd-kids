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
  body: string
): string {
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

<tr>
<td
style="
background:#F2F2F2;
padding:20px;
font-size:12px;
color:#666;
text-align:center;
">
Sent by ${branding.churchName} using Shepherd Kids
</td>
</tr>

</table>

</td>
</tr>
</table>

</body>
</html>
`;
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