"use client";

import CredentialIssuer from "@/components/CredentialIssuer";

export default function Home() {
  return (
    <div className="bg-black/10 h-full fixed top-0 left-0 w-full z-10 overflow-y-auto">
      <div className="min-h-screen container mx-auto px-4 py-8 pb-32">
        <div className="text-center mb-8 space-y-2">
          <h2 className="text-3xl font-bold text-white">Credential Issuer</h2>
          <p className="text-muted-foreground">
            Issue verifiable credentials to identifiers
          </p>
        </div>

        <CredentialIssuer />
      </div>
    </div>
  );
}

