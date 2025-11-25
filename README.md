# Credential Issuer

A Next.js application for issuing verifiable credentials to identifiers.

## Features

- Issue credentials to identifiers (AIDs)
- Support for custom credential attributes
- JSON editor for attribute configuration
- Integration with credential server API

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_CREDENTIAL_SERVER_URL=xxxx
```

## Usage

1. Enter the identifier (AID) of the credential holder
2. Enter the credential type (Schema SAID)
3. Configure attributes as JSON
4. Click "Issue Credential" to issue the credential

## Tech Stack

- Next.js 16
- TypeScript
- Tailwind CSS
- Radix UI
- Monaco Editor
