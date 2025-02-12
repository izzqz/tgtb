import type { TelegramWebApps } from "../types/telegram.ts";

const encoder = new TextEncoder();
const webAppDataBuffer = encoder.encode('WebAppData');

export default function createValidateWebapp(bot_token: string) {
    const botTokenBuffer = encoder.encode(bot_token);
    // Generate secret key: HMAC-SHA256(bot_token, "WebAppData")
    const secretKey = crypto.subtle.importKey(
        'raw',
        webAppDataBuffer,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );

    return async (init_data: string): Promise<TelegramWebApps.WebAppInitData> => {
        if (!init_data) throw new TypeError('InitData is nullish');

        const encoded = decodeURIComponent(init_data);
        const params = encoded.split('&');
        
        // Extract and remove hash from params
        const hashIndex = params.findIndex(p => p.startsWith('hash='));
        if (hashIndex === -1) throw new Error('No hash found in init data');
        const userHash = params.splice(hashIndex, 1)[0].split('=')[1];
        
        // Sort remaining params and join with newlines
        const dataCheckString = params.sort().join('\n');
        
        const dataCheckBuffer = encoder.encode(dataCheckString);

        const secretHash = await crypto.subtle.sign(
            'HMAC',
            await secretKey,
            botTokenBuffer
        );

        // Generate data hash: HMAC-SHA256(data_check_string, secret_key)
        const dataKey = await crypto.subtle.importKey(
            'raw',
            secretHash,
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
        );
        const dataHash = await crypto.subtle.sign(
            'HMAC',
            dataKey,
            dataCheckBuffer
        );

        // Convert hash to hex
        const hashHex = Array.from(new Uint8Array(dataHash))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');

        if (hashHex !== userHash) {
            throw new Error('Hash mismatch');
        }

        // Parse and return validated data
        const urlParams = new URLSearchParams(init_data);
        const metadata: Record<string, unknown> = Object.fromEntries(urlParams);

        if (typeof metadata.user === 'string') {
            const parsedUser = JSON.parse(metadata.user) as TelegramWebApps.WebAppUser;
            metadata.user = {
                ...parsedUser,
                id: Number(parsedUser.id)
            };
        }

        if (typeof metadata.auth_date === 'string') {
            metadata.auth_date = Number(metadata.auth_date) * 1000;
        }

        return metadata as unknown as TelegramWebApps.WebAppInitData;
    };
}