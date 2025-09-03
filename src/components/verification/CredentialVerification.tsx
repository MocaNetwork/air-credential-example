import { type AirService } from "@mocanetwork/airkit";
import { useState } from "react";
import type { EnvironmentConfig } from "../../config/environments";
import { generateJwt, getJwtPayload, EXAMPLE_JWKS_URL } from "../../utils";
import CollapsibleSection from "../CollapsibleSection";

// Environment variables for configuration
const LOCALE = import.meta.env.VITE_LOCALE || "en";

interface CredentialVerificationProps {
  airService: AirService | null;
  isLoggedIn: boolean;
  partnerId: string;
  environmentConfig: EnvironmentConfig;
}

const CredentialVerification = ({
  airService,
  isLoggedIn,
  partnerId,
  environmentConfig,
}: CredentialVerificationProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    status: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generatedJwt, setGeneratedJwt] = useState<string>("");

  // Configuration - these would typically come from environment variables or API
  const [config, setConfig] = useState({
    verifierDid: import.meta.env.VITE_VERIFIER_DID || "did:example:verifier123",
    programId: import.meta.env.VITE_PROGRAM_ID || "c21hc030kb5iu0030224Qs",
    redirectUrlForIssuer:
      import.meta.env.VITE_REDIRECT_URL_FOR_ISSUER ||
      "http://localhost:5173/issue",
  });

  const [privateKey, setPrivateKey] = useState(
    import.meta.env.VITE_PRIVATE_KEY || ""
  );

  const [kid, setKid] = useState(
    import.meta.env.VITE_KID || ""
  );

  const [jwtAlgorithm, setJwtAlgorithm] = useState<"ES256" | "RS256">(
    (import.meta.env.VITE_JWT_ALGORITHM as "ES256" | "RS256") || "ES256"
  );

  console.log("AirService in CredentialVerification:", airService);

  const handleConfigChange = (field: string, value: string) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  const handleVerifyCredential = async () => {
    setIsLoading(true);
    setError(null);
    setVerificationResult(null);

    try {
      const jwt =
        generatedJwt ||
        (await generateJwt({
          partnerId,
          privateKey,
          kid,
          jwtAlgorithm,
        }));

      if (!jwt) {
        setError("Failed to generate JWT");
        setIsLoading(false);
        return;
      }

      if (!airService) {
        setError(
          "AirService is not initialized. Please check your partner ID."
        );
        setIsLoading(false);
        return;
      }

      const result = await airService.verifyCredential({
        authToken: jwt,
        programId: config.programId,
        redirectUrl: config.redirectUrlForIssuer,
      });

      setVerificationResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setIsLoading(false);
    }
  };

  const handleGenerateJwt = async () => {
    setError(null);
    try {
      const jwt = await generateJwt({ partnerId, privateKey, kid, jwtAlgorithm });
      if (!jwt) {
        setError("Failed to generate JWT");
        setGeneratedJwt("");
        return;
      }
      setGeneratedJwt(jwt);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setGeneratedJwt("");
    }
  };

  const handleReset = () => {
    setVerificationResult(null);
    setError(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Compliant":
        return "text-green-800 bg-green-50 border-green-200";
      case "Non-Compliant":
        return "text-red-800 bg-red-50 border-red-200";
      case "Pending":
        return "text-yellow-800 bg-yellow-50 border-yellow-200";
      case "Revoking":
      case "Revoked":
        return "text-orange-800 bg-orange-50 border-orange-200";
      case "Expired":
        return "text-gray-800 bg-gray-50 border-gray-200";
      case "NotFound":
        return "text-purple-800 bg-purple-50 border-purple-200";
      default:
        return "text-gray-800 bg-gray-50 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Compliant":
        return "✅";
      case "Non-Compliant":
        return "❌";
      case "Pending":
        return "⏳";
      case "Revoking":
        return "🔄";
      case "Revoked":
        return "🚫";
      case "Expired":
        return "⏰";
      case "NotFound":
        return "🔍";
      default:
        return "❓";
    }
  };

  const getStatusDescription = (status: string) => {
    switch (status) {
      case "Compliant":
        return "The credential is valid and meets all verification requirements.";
      case "Non-Compliant":
        return "The credential does not meet the verification requirements.";
      case "Pending":
        return "The credential is waiting for confirmation on the blockchain.";
      case "Revoking":
        return "The credential is currently being revoked.";
      case "Revoked":
        return "The credential has been revoked and is no longer valid.";
      case "Expired":
        return "The credential has expired and is no longer valid.";
      case "NotFound":
        return "No credential was found matching the verification criteria.";
      default:
        return "Unknown verification status.";
    }
  };

  const isDisabled =
    isLoading ||
    !isLoggedIn ||
    !generatedJwt ||
    !config.programId ||
    !config.redirectUrlForIssuer;

  return (
    <div className="flex-1 p-2 sm:p-4 lg:p-8">
      <div className="max-w-full sm:max-w-2xl md:max-w-4xl lg:max-w-6xl mx-auto bg-white rounded-lg shadow-lg p-2 sm:p-6 lg:p-8">
        <div className="mb-4 sm:mb-6 lg:mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-verify-700 mb-2 sm:mb-4">Credential Verification</h2>
          <p className="text-gray-600 text-sm sm:text-base">
            Verify digital credentials using the AIR Credential SDK. Configure the verification parameters below and Start the widget to begin the
            verification process.
          </p>
        </div>

        {/* JWT generation Section */}
        <CollapsibleSection title="Authentication" defaultCollapsed>
          <div className="grid gap-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Private Key
                </label>
                <textarea
                  value={privateKey}
                  onChange={(e) => setPrivateKey(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 resize-vertical"
                  placeholder="Enter your private key (PEM format)"
                  rows={4}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  JWT Payload (readonly)
                </label>
                <textarea
                  value={JSON.stringify(getJwtPayload(partnerId), null, 2)}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 resize-vertical"
                  rows={4}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  KID (Key ID)
                </label>
                <input
                  type="text"
                  value={kid}
                  onChange={(e) => setKid(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="Enter your KID"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  JWT Algorithm
                </label>
                <select
                  value={jwtAlgorithm}
                  onChange={(e) => setJwtAlgorithm(e.target.value as "ES256" | "RS256")}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="ES256">ES256</option>
                  <option value="RS256">RS256</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleGenerateJwt}
                disabled={!privateKey || !partnerId}
                className="px-4 py-2 bg-gray-800 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Generate JWT
              </button>
              {generatedJwt && (
                <span className="text-xs text-gray-600">JWT generated</span>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Auth Token
              </label>
              <textarea
                value={generatedJwt}
                onChange={(e) => setGeneratedJwt(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 resize-vertical"
                placeholder="Enter your JWT"
                rows={6}
              />
            </div>
            
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-xs text-yellow-800">
                <strong>Notes:</strong> The default key corresponds to <a href={EXAMPLE_JWKS_URL} target="_blank" rel="noopener noreferrer">{EXAMPLE_JWKS_URL}</a>. For production applications, 
                private key management and JWT generation should be handled on the backend for security.
              </p>
            </div>
          </div>
        </CollapsibleSection>

        {/* Configuration Section */}
        <div className="mb-6 sm:mb-8">
          <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2 sm:mb-4">Configuration</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Verifier DID</label>
              <input
                type="text"
                value={config.verifierDid}
                onChange={(e) => handleConfigChange("verifierDid", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="Your verifier DID"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Program ID</label>
              <input
                type="text"
                value={config.programId}
                onChange={(e) => handleConfigChange("programId", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="program-123"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Partner ID (from NavBar)
              </label>
              <input
                type="text"
                value={partnerId}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 cursor-not-allowed"
                placeholder="Partner ID from NavBar"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Redirect URL for Issuer</label>
              <input
                type="url"
                value={config.redirectUrlForIssuer}
                onChange={(e) => handleConfigChange("redirectUrlForIssuer", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="https://example.com/issue-credential"
              />
            </div>
          </div>
        </div>

        {/* Environment Info */}
        <div className="mb-6 sm:mb-8 p-2 sm:p-4 bg-gray-50 border border-gray-200 rounded-md">
          <h4 className="text-xs sm:text-sm font-medium text-gray-900 mb-1 sm:mb-2">Environment Configuration:</h4>
          <div className="text-xs text-gray-700 space-y-1">
            <p>
              <strong>Widget URL:</strong> {environmentConfig.widgetUrl}
            </p>
            <p>
              <strong>API URL:</strong> {environmentConfig.apiUrl}
            </p>
            <p>
              <strong>Theme:</strong> light
            </p>
            <p>
              <strong>Locale:</strong> {LOCALE}
            </p>
          </div>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="mb-4 sm:mb-6 p-2 sm:p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800 text-xs sm:text-base">{error}</p>
          </div>
        )}

        {/* Verification Results */}
        {verificationResult && (
          <div className="mb-6 sm:mb-8">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2 sm:mb-4">Verification Results</h3>
            <div className="p-2 sm:p-4 border rounded-md">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900 text-sm sm:text-base">Verification Result</h4>
                <span
                  className={`mt-2 sm:mt-0 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium border ${getStatusColor(
                    verificationResult.status
                  )}`}
                >
                  {getStatusIcon(verificationResult.status)} {verificationResult.status}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-gray-600 mb-2">{getStatusDescription(verificationResult.status)}</p>
              <pre className="text-xs text-gray-500 bg-gray-50 p-2 rounded overflow-auto">{JSON.stringify(verificationResult, null, 2)}</pre>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
          <button
            onClick={handleVerifyCredential}
            disabled={isDisabled}
            className="w-full sm:flex-1 bg-verify-600 text-white px-4 sm:px-6 py-3 rounded-md font-medium hover:bg-verify-700 focus:outline-none focus:ring-2 focus:ring-verify-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Launching Widget...
              </span>
            ) : (
              "Start Credential Verification Widget"
            )}
          </button>

          {verificationResult && (
            <button
              onClick={handleReset}
              className="w-full sm:w-auto px-4 sm:px-6 py-3 border border-verify-300 text-verify-700 rounded-md font-medium hover:bg-verify-50 focus:outline-none focus:ring-2 focus:ring-verify-500 focus:ring-offset-2 transition-colors"
            >
              Reset
            </button>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-6 sm:mt-8 p-2 sm:p-4 bg-blue-50 border border-blue-200 rounded-md">
          <h4 className="text-xs sm:text-sm font-medium text-blue-900 mb-1 sm:mb-2">Instructions:</h4>
          <ul className="text-xs sm:text-sm text-blue-800 space-y-1">
            <li>• Need to whitelist the cross partner domain in Airkit </li>
            <li>• Configure the verifier API key and program ID</li>
            <li>• Set the partner id</li>
            <li>• Set the redirect URL for issuer if required</li>
            <li>• Click "Start Credential Verification Widget" to start the process</li>
            <li>• The widget will handle the credential verification flow</li>
            <li>• Review the verification results after completion</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default CredentialVerification;
