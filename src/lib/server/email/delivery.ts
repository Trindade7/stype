import net from 'node:net';
import tls from 'node:tls';

export interface PasswordResetEmailOptions {
	to: string;
	username: string;
	resetUrl: string;
}

export interface SmtpConfig {
	host: string;
	port: number;
	user?: string;
	pass?: string;
	from: string;
	secure?: boolean;
}

export interface EmailContent {
	from: string;
	to: string;
	subject: string;
	text: string;
	html: string;
}

export function getSmtpConfig(): SmtpConfig | null {
	const host = process.env.SMTP_HOST;
	if (!host) {
		return null;
	}

	const port = Number.parseInt(process.env.SMTP_PORT || '587', 10);
	const user = process.env.SMTP_USER;
	const pass = process.env.SMTP_PASS;
	const from = process.env.SMTP_FROM || `noreply@${host}`;
	const secure = process.env.SMTP_SECURE === 'true' || port === 465;

	return {
		host,
		port,
		user,
		pass,
		from,
		secure
	};
}

export function buildPasswordResetEmailContent(
	options: PasswordResetEmailOptions,
	fromAddress: string
): EmailContent {
	const subject = 'Password Reset Request - Stype';

	const text = `Hello ${options.username},

You requested to reset your password for Stype. Open the link below to choose a new password:

${options.resetUrl}

This link is valid for 15 minutes. If you did not request a password reset, you can safely ignore this email.
`;

	const html = `<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<title>Password Reset Request</title>
</head>
<body style="font-family: sans-serif; line-height: 1.6; color: #18181b; background-color: #f4f4f5; padding: 24px;">
	<div style="max-width: 560px; margin: 0 auto; background: #ffffff; padding: 32px; border-radius: 8px; border: 1px solid #e4e4e7;">
		<h2 style="margin-top: 0; color: #18181b;">stype</h2>
		<p>Hello <strong>${options.username}</strong>,</p>
		<p>You requested to reset your password for Stype. Click the link below to choose a new password:</p>
		<p style="margin: 24px 0;">
			<a href="${options.resetUrl}" style="background-color: #18181b; color: #fafafa; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 500; display: inline-block;">
				Reset Password
			</a>
		</p>
		<p style="font-size: 13px; color: #71717a; word-break: break-all;">
			Or copy and paste this URL into your browser:<br>
			<a href="${options.resetUrl}" style="color: #71717a;">${options.resetUrl}</a>
		</p>
		<hr style="border: none; border-top: 1px solid #e4e4e7; margin: 24px 0;">
		<p style="font-size: 12px; color: #a1a1aa; margin-bottom: 0;">
			This link is valid for 15 minutes. If you did not request a password reset, you can safely ignore this email.
		</p>
	</div>
</body>
</html>`;

	return {
		from: fromAddress,
		to: options.to,
		subject,
		text,
		html
	};
}

export async function sendViaSmtp(
	config: SmtpConfig,
	options: PasswordResetEmailOptions
): Promise<void> {
	const email = buildPasswordResetEmailContent(options, config.from);
	const boundary = `stype_boundary_${Date.now()}`;

	const mimeMessage = [
		`From: ${email.from}`,
		`To: ${email.to}`,
		`Subject: ${email.subject}`,
		'MIME-Version: 1.0',
		`Content-Type: multipart/alternative; boundary="${boundary}"`,
		'',
		`--${boundary}`,
		'Content-Type: text/plain; charset=utf-8',
		'Content-Transfer-Encoding: 7bit',
		'',
		email.text,
		'',
		`--${boundary}`,
		'Content-Type: text/html; charset=utf-8',
		'Content-Transfer-Encoding: 7bit',
		'',
		email.html,
		'',
		`--${boundary}--`,
		''
	].join('\r\n');

	return new Promise((resolve, reject) => {
		let socket: net.Socket | tls.TLSSocket;
		let buffer = '';

		const onConnect = () => {};

		if (config.secure) {
			socket = tls.connect(config.port, config.host, { rejectUnauthorized: false }, onConnect);
		} else {
			socket = net.connect(config.port, config.host, onConnect);
		}

		socket.setEncoding('utf8');

		const sendCommand = (cmd: string) => {
			socket.write(cmd + '\r\n');
		};

		let stage = 'INIT';

		socket.on('data', (data: string) => {
			buffer += data;
			const lines = buffer.split('\r\n');
			buffer = lines.pop() || '';

			for (const line of lines) {
				const code = Number.parseInt(line.slice(0, 3), 10);
				const isFinal = line.charAt(3) === ' ';

				if (!isFinal) continue;

				switch (stage) {
					case 'INIT':
						if (code === 220) {
							stage = 'HELO';
							sendCommand(`EHLO ${config.host}`);
						} else {
							cleanup();
							reject(new Error(`SMTP init failed: ${line}`));
						}
						break;

					case 'HELO':
						if (code === 250) {
							if (config.user && config.pass) {
								stage = 'AUTH';
								sendCommand('AUTH LOGIN');
							} else {
								stage = 'MAIL';
								sendCommand(`MAIL FROM:<${config.from}>`);
							}
						} else {
							cleanup();
							reject(new Error(`SMTP EHLO failed: ${line}`));
						}
						break;

					case 'AUTH':
						if (code === 334) {
							stage = 'AUTH_USER';
							sendCommand(Buffer.from(config.user || '').toString('base64'));
						} else {
							cleanup();
							reject(new Error(`SMTP AUTH failed: ${line}`));
						}
						break;

					case 'AUTH_USER':
						if (code === 334) {
							stage = 'AUTH_PASS';
							sendCommand(Buffer.from(config.pass || '').toString('base64'));
						} else {
							cleanup();
							reject(new Error(`SMTP AUTH USER failed: ${line}`));
						}
						break;

					case 'AUTH_PASS':
						if (code === 235) {
							stage = 'MAIL';
							sendCommand(`MAIL FROM:<${config.from}>`);
						} else {
							cleanup();
							reject(new Error(`SMTP AUTH PASS failed: ${line}`));
						}
						break;

					case 'MAIL':
						if (code === 250) {
							stage = 'RCPT';
							sendCommand(`RCPT TO:<${email.to}>`);
						} else {
							cleanup();
							reject(new Error(`SMTP MAIL FROM failed: ${line}`));
						}
						break;

					case 'RCPT':
						if (code === 250) {
							stage = 'DATA';
							sendCommand('DATA');
						} else {
							cleanup();
							reject(new Error(`SMTP RCPT TO failed: ${line}`));
						}
						break;

					case 'DATA':
						if (code === 354) {
							stage = 'BODY';
							socket.write(mimeMessage + '\r\n.\r\n');
						} else {
							cleanup();
							reject(new Error(`SMTP DATA failed: ${line}`));
						}
						break;

					case 'BODY':
						if (code === 250) {
							stage = 'QUIT';
							sendCommand('QUIT');
						} else {
							cleanup();
							reject(new Error(`SMTP body transmit failed: ${line}`));
						}
						break;

					case 'QUIT':
						cleanup();
						resolve();
						break;
				}
			}
		});

		const cleanup = () => {
			socket.removeAllListeners();
			socket.end();
			socket.destroy();
		};

		socket.on('error', (err) => {
			cleanup();
			reject(err);
		});

		socket.setTimeout(10000, () => {
			cleanup();
			reject(new Error('SMTP connection timed out'));
		});
	});
}

export async function sendPasswordResetEmail(
	options: PasswordResetEmailOptions,
	customTransport?: (config: SmtpConfig, options: PasswordResetEmailOptions) => Promise<void>
): Promise<{ delivered: boolean; mode: 'smtp' | 'console' }> {
	const config = getSmtpConfig();

	if (config) {
		const transport = customTransport || sendViaSmtp;
		await transport(config, options);
		return { delivered: true, mode: 'smtp' };
	}

	// Fallback to server console when SMTP is unconfigured
	console.log(`[Password Reset] Reset URL for ${options.username} (${options.to}): ${options.resetUrl}`);
	return { delivered: true, mode: 'console' };
}
