export const metadata = {
  title: "Privacy Policy — Muvie",
};

export default function PrivacyPage() {
  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px", fontFamily: "sans-serif", lineHeight: 1.7, color: "#ececec", background: "#121212", minHeight: "100vh" }}>
      <h1>Privacy Policy</h1>
      <p><em>Last updated: March 2026</em></p>

      <h2>1. Information We Collect</h2>
      <p>We collect the following information when you use Muvie:</p>
      <ul>
        <li><strong>Account data:</strong> username and passkey credentials (no passwords stored).</li>
        <li><strong>Chat messages:</strong> the messages you send to the AI assistant in order to provide responses.</li>
        <li><strong>Device identifiers:</strong> used for passkey authentication.</li>
      </ul>

      <h2>2. How We Use Your Information</h2>
      <ul>
        <li>To authenticate you securely via passkeys (Face ID / Touch ID).</li>
        <li>To provide AI-powered movie and TV recommendations.</li>
        <li>To maintain your account and preferences.</li>
      </ul>

      <h2>3. Data Sharing</h2>
      <p>We do not sell your personal data. Chat messages are processed by Google Gemini AI to generate responses. Please review <a href="https://policies.google.com/privacy" style={{ color: "#6c63ff" }}>Google's Privacy Policy</a> for details on how they handle data.</p>

      <h2>4. Data Retention</h2>
      <p>Your account data is retained as long as your account is active. You may request deletion at any time by contacting us.</p>

      <h2>5. Security</h2>
      <p>We use passkey-based authentication (WebAuthn) so no passwords are stored. All data is transmitted over HTTPS.</p>

      <h2>6. Children's Privacy</h2>
      <p>Muvie is not directed at children under 13. We do not knowingly collect data from children under 13.</p>

      <h2>7. Contact</h2>
      <p>For privacy questions or data deletion requests, contact us at: <a href="mailto:hi@muvie.org" style={{ color: "#6c63ff" }}>hi@muvie.org</a></p>
    </main>
  );
}
