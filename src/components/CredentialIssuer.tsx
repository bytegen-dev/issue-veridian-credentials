"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Shield, Loader2, CheckCircle, XCircle, Upload } from "lucide-react";
import Editor from "@monaco-editor/react";

// Example credential templates
const EXAMPLE_CREDENTIALS = [
  {
    name: "Rare EVO 2024 Attendee",
    schemaSaid: "EJxnJdxkHbRw2wVFNe4IUOPLt8fEtg9Sr3WyTjlgKoIb",
    attributes: {
      attendeeName: "John Doe",
    },
  },
  {
    name: "Foundation Employee",
    schemaSaid: "EL9oOWU_7zQn_rD--Xsgi3giCWnFDaNvFMUGTOZx1ARO",
    attributes: {
      email: "john.doe@example.com",
      firstName: "John",
      lastName: "Doe",
    },
  },
  {
    name: "Qualified vLEI Issuer Credential",
    schemaSaid: "EBfdlu8R27Fbx-ehrqwImnK-8Cm79sqbAQ4MmvEAYqao",
    attributes: {
      LEI: "5493000X9UK29YM9OD70",
      gracePeriod: 90,
    },
  },
  {
    name: "Legal Entity vLEI",
    schemaSaid: "ENPXp1vQzRF6JwIuS-mp2U8Uf1MoADoP_GqQ62VsDZWY",
    attributes: {
      LEI: "5493000X9UK29YM9OD70",
    },
  },
];

export default function CredentialIssuer() {
  // Load default identifier from environment variable
  const defaultIdentifier = process.env.NEXT_PUBLIC_DEFAULT_IDENTIFIER_ID || "";

  const [identifier, setIdentifier] = useState(defaultIdentifier);
  const [credentialType, setCredentialType] = useState("");
  const [attributes, setAttributes] = useState("{}");
  const [isIssuing, setIsIssuing] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    data?: any;
  } | null>(null);

  const loadExample = (exampleName: string) => {
    const example = EXAMPLE_CREDENTIALS.find((ex) => ex.name === exampleName);
    if (example) {
      setCredentialType(example.schemaSaid);
      setAttributes(JSON.stringify(example.attributes, null, 2));
    }
  };

  const handleSchemaImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const schema = JSON.parse(content);

        // Validate it's a schema object
        if (!schema || typeof schema !== "object") {
          setResult({
            success: false,
            message: "Invalid schema file: Not a valid JSON object",
          });
          return;
        }

        // Extract schema SAID from $id field
        const schemaSaid = schema.$id;
        if (!schemaSaid || typeof schemaSaid !== "string") {
          setResult({
            success: false,
            message:
              "Invalid schema file: Missing or invalid $id field (Schema SAID)",
          });
          return;
        }

        // Extract attribute examples from schema properties if available
        let attributeExamples: any = {};
        if (schema.properties?.a?.oneOf?.[1]?.properties) {
          const attributeProperties = schema.properties.a.oneOf[1].properties;
          // Extract custom attributes (skip metadata fields like d, i, dt)
          Object.keys(attributeProperties).forEach((key) => {
            if (!["d", "i", "dt"].includes(key)) {
              const prop = attributeProperties[key];
              // Set example values based on type
              if (prop.type === "string") {
                attributeExamples[key] = `example_${key}`;
              } else if (prop.type === "number") {
                attributeExamples[key] = 0;
              } else if (prop.type === "boolean") {
                attributeExamples[key] = false;
              } else {
                attributeExamples[key] = null;
              }
            }
          });
        }

        // Pre-fill the credential type with the schema SAID
        setCredentialType(schemaSaid);

        // Pre-fill attributes if we found any
        if (Object.keys(attributeExamples).length > 0) {
          setAttributes(JSON.stringify(attributeExamples, null, 2));
        }

        // Show success message
        setResult({
          success: true,
          message: `Schema imported successfully! Schema SAID: ${schemaSaid}`,
          data: {
            schemaSaid: schemaSaid,
            title: schema.title || "Unknown",
            credentialType: schema.credentialType || "Unknown",
            version: schema.version || "Unknown",
            attributesFound: Object.keys(attributeExamples).length,
          },
        });
      } catch (error: any) {
        console.error("Failed to import schema:", error);
        setResult({
          success: false,
          message: `Failed to import schema: ${
            error.message || "Invalid JSON file"
          }`,
        });
      }
    };

    reader.onerror = () => {
      setResult({
        success: false,
        message: "Failed to read the schema file",
      });
    };

    reader.readAsText(file);

    // Reset file input so the same file can be selected again
    event.target.value = "";
  };

  const handleIssue = async () => {
    if (!identifier.trim() || !credentialType.trim()) {
      setResult({
        success: false,
        message: "Please fill in all required fields",
      });
      return;
    }

    setIsIssuing(true);
    setResult(null);

    try {
      // Parse attributes JSON
      let parsedAttributes = {};
      try {
        parsedAttributes = JSON.parse(attributes);
      } catch (e) {
        setResult({
          success: false,
          message: "Invalid JSON in attributes field",
        });
        setIsIssuing(false);
        return;
      }

      const credentialServerUrl =
        process.env.NEXT_PUBLIC_CREDENTIAL_SERVER_URL ||
        "https://cred-issuance.dev.idw-sandboxes.cf-deployments.org";

      // Issue credential via credential server
      // API expects: { schemaSaid, aid, attribute }
      const requestBody: any = {
        schemaSaid: credentialType,
        aid: identifier,
      };

      // Add attribute object if attributes are provided
      if (Object.keys(parsedAttributes).length > 0) {
        requestBody.attribute = parsedAttributes;
      }

      const response = await fetch(
        `${credentialServerUrl}/issueAcdcCredential`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          data: "Unknown error",
        }));
        throw new Error(
          errorData.data || `HTTP error! status: ${response.status}`
        );
      }

      const data = await response.json();
      setResult({
        success: true,
        message: "Credential issued successfully!",
        data: data,
      });
    } catch (error: any) {
      console.error("Failed to issue credential:", error);
      setResult({
        success: false,
        message: error.message || "Failed to issue credential",
      });
    } finally {
      setIsIssuing(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Issue Credential
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="load-example">Load Example</Label>
            <Select onValueChange={loadExample} defaultValue="">
              <SelectTrigger id="load-example" className="w-full">
                <SelectValue placeholder="Select an example..." />
              </SelectTrigger>
              <SelectContent>
                {EXAMPLE_CREDENTIALS.map((example) => (
                  <SelectItem key={example.name} value={example.name}>
                    {example.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Select an example to pre-fill the credential type and attributes
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="import-schema">Import Schema JSON</Label>
            <div className="flex items-center gap-2">
              <Input
                id="import-schema"
                type="file"
                accept=".json,application/json"
                onChange={handleSchemaImport}
                className="hidden"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  document.getElementById("import-schema")?.click()
                }
                className="w-full"
                type="button"
              >
                <Upload className="h-4 w-4 mr-2" />
                Import Schema File
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Import a schema JSON file generated by the Schema Builder. The
              schema SAID will be automatically extracted and pre-filled, along
              with attribute examples if available.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="identifier">
              Identifier (AID) <span className="text-red-500">*</span>
            </Label>
            <Input
              id="identifier"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="Enter identifier AID..."
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              The identifier (AID) of the holder who will receive the credential
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="credential-type">
              Credential Type (Schema SAID){" "}
              <span className="text-red-500">*</span>
            </Label>
            <Input
              id="credential-type"
              value={credentialType}
              onChange={(e) => setCredentialType(e.target.value)}
              placeholder="Enter schema SAID..."
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              The schema SAID for the credential type
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="attributes">Attributes (JSON)</Label>
            <div className="border rounded-md overflow-hidden">
              <Editor
                height="200px"
                defaultLanguage="json"
                value={attributes}
                onChange={(value) => setAttributes(value || "{}")}
                options={{
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  fontSize: 14,
                  lineNumbers: "on",
                  wordWrap: "on",
                  automaticLayout: true,
                }}
                theme="vs-dark"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              JSON object containing credential attributes
            </p>
          </div>

          <Button
            onClick={handleIssue}
            disabled={isIssuing || !identifier.trim() || !credentialType.trim()}
            className="w-full"
            size="lg"
          >
            {isIssuing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Issuing Credential...
              </>
            ) : (
              <>
                <Shield className="h-4 w-4 mr-2" />
                Issue Credential
              </>
            )}
          </Button>

          {result && (
            <div
              className={`p-4 rounded-md border ${
                result.success
                  ? "border-green-500 bg-green-500/10"
                  : "border-red-500 bg-red-500/10"
              }`}
            >
              <div className="flex items-start gap-2">
                {result.success ? (
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                )}
                <div className="flex-1">
                  <p
                    className={`text-sm font-medium ${
                      result.success ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {result.message}
                  </p>
                  {result.data && (
                    <div className="mt-2">
                      <div className="border rounded-md overflow-hidden">
                        <Editor
                          height="150px"
                          defaultLanguage="json"
                          value={JSON.stringify(result.data, null, 2)}
                          options={{
                            minimap: { enabled: false },
                            scrollBeyondLastLine: false,
                            fontSize: 12,
                            lineNumbers: "on",
                            wordWrap: "on",
                            readOnly: true,
                          }}
                          theme="vs-dark"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">How it works</h3>
            <p className="text-sm text-muted-foreground">
              This tool allows you to issue verifiable credentials to
              identifiers using the credential server API.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-sm">Required Fields</h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>
                <strong>Identifier (AID):</strong> The KERI identifier of the
                credential holder
              </li>
              <li>
                <strong>Credential Type:</strong> The schema SAID that defines
                the credential structure
              </li>
            </ul>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-sm">Attributes</h3>
            <p className="text-sm text-muted-foreground">
              The attributes field accepts a JSON object with key-value pairs
              that will be included in the credential. Make sure the JSON is
              valid before issuing.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
