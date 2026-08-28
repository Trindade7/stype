import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
	sendPasswordResetEmail,
	getSmtpConfig,
	buildPasswordResetEmailContent
} from './delivery';

describe('Password Reset Delivery Abstraction', () => {
	const originalEnv = process.env;

	beforeEach(() => {
		process.env = { ...originalEnv };
		delete process.env.SMTP_HOST;
		delete process.env.SMTP_PORT;
		delete process.env.SMTP_USER;
		delete process.env.SMTP_PASS;
		delete process.env.SMTP_FROM;
	});

	afterEach(() => {
		process.env = originalEnv;
		vi.restoreAllMocks();
	});

	it('returns null config when SMTP_HOST is unset', () => {
		expect(getSmtpConfig()).toBeNull();
	});

	it('reads SMTP environment variables when configured', () => {
		process.env.SMTP_HOST = 'smtp.example.com';
		process.env.SMTP_PORT = '465';
		process.env.SMTP_USER = 'smtpuser';
		process.env.SMTP_PASS = 'smtppass';
		process.env.SMTP_FROM = 'support@stype.local';

		const config = getSmtpConfig();
		expect(config).toEqual({
			host: 'smtp.example.com',
			port: 465,
			user: 'smtpuser',
			pass: 'smtppass',
			from: 'support@stype.local',
			secure: true
		});
	});

	it('logs reset URL to server console when SMTP is unconfigured', async () => {
		const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

		const result = await sendPasswordResetEmail({
			to: 'typist@example.com',
			username: 'speedy',
			resetUrl: 'https://stype.local/app/reset-password?token=mocktoken123'
		});

		expect(result).toEqual({ delivered: true, mode: 'console' });
		expect(consoleSpy).toHaveBeenCalled();

		const loggedOutput = consoleSpy.mock.calls.flat().join(' ');
		expect(loggedOutput).toContain('https://stype.local/app/reset-password?token=mocktoken123');
		expect(loggedOutput).toContain('typist@example.com');
	});

	it('sends email through transport when SMTP is configured', async () => {
		process.env.SMTP_HOST = 'smtp.example.com';
		process.env.SMTP_PORT = '587';
		process.env.SMTP_FROM = 'noreply@stype.local';

		const mockTransport = vi.fn().mockResolvedValue(undefined);

		const result = await sendPasswordResetEmail(
			{
				to: 'racer@example.com',
				username: 'roadrunner',
				resetUrl: 'https://stype.local/app/reset-password?token=token-abc'
			},
			mockTransport
		);

		expect(result).toEqual({ delivered: true, mode: 'smtp' });
		expect(mockTransport).toHaveBeenCalledTimes(1);
		expect(mockTransport).toHaveBeenCalledWith(
			expect.objectContaining({
				host: 'smtp.example.com',
				port: 587,
				from: 'noreply@stype.local'
			}),
			{
				to: 'racer@example.com',
				username: 'roadrunner',
				resetUrl: 'https://stype.local/app/reset-password?token=token-abc'
			}
		);
	});

	it('formats plaintext and HTML email templates containing username and reset URL', () => {
		const content = buildPasswordResetEmailContent({
			to: 'typist@example.com',
			username: 'speedy',
			resetUrl: 'https://stype.local/app/reset-password?token=token123'
		}, 'noreply@stype.local');

		expect(content.subject).toBe('Password Reset Request - Stype');
		expect(content.text).toContain('speedy');
		expect(content.text).toContain('https://stype.local/app/reset-password?token=token123');
		expect(content.text).toContain('15 minutes');

		expect(content.html).toContain('speedy');
		expect(content.html).toContain('href="https://stype.local/app/reset-password?token=token123"');
		expect(content.html).toContain('15 minutes');
	});
});
