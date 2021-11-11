/**
 * Grabs our token secret env variable, or a secure-ish fallback
 */
export function getSecret(): string {
    return process.env.TOKEN_SECRET || '09342!hBj02r30Akf4@';
}
