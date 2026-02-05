# Security Policy

## 🔒 Security Features

HealthMesh implements enterprise-grade security measures to protect healthcare data:

### Authentication & Authorization
- **Microsoft Entra ID (Azure AD)** - Enterprise single sign-on
- **Multi-tenant support** - Hospital-level data isolation
- **Role-based access control (RBAC)** - Granular permissions
- **Token validation** - JWT verification with JWKS

### Data Protection
- **AES-256 encryption** - Patient QR code system
- **Database encryption** - At-rest and in-transit
- **Input sanitization** - XSS and injection prevention
- **HIPAA compliance ready** - Healthcare data standards

### Infrastructure Security
- **Helmet.js** - Security headers (CSP, HSTS, XSS protection)
- **CORS protection** - Allowed origins whitelist
- **Rate limiting** - DDoS and brute-force prevention
- **TLS/SSL** - Encrypted connections (production)

### Monitoring & Audit
- **Request logging** - Full audit trail
- **Environment validation** - Startup configuration checks
- **Dependency auditing** - Automated vulnerability scanning
- **Security headers** - Content Security Policy, X-Frame-Options

## 📋 Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability:

### Please DO:
1. **Email us privately** at [your-security-email@example.com]
2. **Provide detailed information**:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)
3. **Allow reasonable time** for us to respond (within 48 hours)
4. **Keep it confidential** until we've addressed the issue

### Please DON'T:
- ❌ Open a public GitHub issue
- ❌ Share the vulnerability publicly
- ❌ Exploit the vulnerability
- ❌ Access data that doesn't belong to you

### Response Timeline
- **Within 48 hours**: Initial acknowledgment
- **Within 7 days**: Assessment and severity classification
- **Within 30 days**: Fix or mitigation plan
- **After fix**: Public disclosure (coordinated)

## 🛡️ Security Checklist

### For Developers

Before deploying to production:

- [ ] All environment variables set (see `.env.example`)
- [ ] QR_ENCRYPTION_KEY is exactly 32 characters
- [ ] SESSION_SECRET is 64+ characters (generated randomly)
- [ ] No hardcoded secrets in code
- [ ] AZURE_AD credentials are valid
- [ ] Database credentials are secure
- [ ] HTTPS enabled (TLS/SSL certificates)
- [ ] CORS configured for production domains
- [ ] Rate limiting enabled
- [ ] Audit logs enabled
- [ ] Run `npm audit` and fix vulnerabilities
- [ ] Run `npm run security-audit`
- [ ] Run TypeScript compiler (`npm run check`)

### Environment Variables Security

**CRITICAL - MUST CHANGE IN PRODUCTION:**
```bash
# Generate secure secrets:
openssl rand -hex 32                    # For SESSION_SECRET
openssl rand -base64 32 | cut -c1-32   # For QR_ENCRYPTION_KEY
```

**Never commit these files:**
- `.env`
- `.env.local`
- `.env.production`
- `*.db` files
- Any files with secrets/keys

## 🔐 Encryption Standards

### Patient QR System
- **Algorithm**: AES-256-CBC
- **Key length**: 256 bits (32 bytes)
- **IV**: Random per encryption
- **Usage**: Patient identity verification

### Session Management
- **Storage**: MemoryStore (development), Redis (production recommended)
- **Cookie settings**:
  - `httpOnly: true` - Prevent XSS
  - `secure: true` (production) - HTTPS only
  - `sameSite: 'strict'` - CSRF protection
  - `maxAge`: 24 hours

### Database
- **At-rest**: Azure SQL TDE (Transparent Data Encryption)
- **In-transit**: TLS 1.2+
- **Backups**: Encrypted with Azure Key Vault

## 🚨 Security Headers

Configured via Helmet.js:

| Header | Value | Purpose |
|--------|-------|---------|
| `Content-Security-Policy` | Configured | Prevent XSS, injection |
| `X-Frame-Options` | DENY | Clickjacking protection |
| `X-Content-Type-Options` | nosniff | MIME sniffing protection |
| `Strict-Transport-Security` | max-age=31536000 | Force HTTPS |
| `X-XSS-Protection` | 1; mode=block | Legacy XSS protection |
| `Referrer-Policy` | strict-origin-when-cross-origin | Privacy |
| `Permissions-Policy` | Restrictive | Feature permissions |

## 🔄 Rate Limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| General API | 100 req | 15 min |
| Authentication | 5 req | 15 min |
| AI/Agents | 10 req | 1 min |

## 📊 Compliance

HealthMesh is designed with compliance in mind:

- **HIPAA** - Healthcare data privacy
- **GDPR** - EU data protection (applicable for EU users)
- **SOC 2** - Service organization controls
- **ISO 27001** - Information security management

*Note: Compliance certification requires proper deployment configuration and operational procedures.*

## 🔧 Security Updates

### Dependency Management
```bash
# Check for vulnerabilities
npm audit

# Update dependencies
npm update --legacy-peer-deps

# Run security audit
npm run security-audit
```

### Update Policy
- **Critical vulnerabilities**: Patch within 24 hours
- **High vulnerabilities**: Patch within 7 days
- **Moderate vulnerabilities**: Patch within 30 days
- **Low vulnerabilities**: Next release cycle

## 📚 Security Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Microsoft Security Best Practices](https://docs.microsoft.com/en-us/security/)
- [HIPAA Security Rule](https://www.hhs.gov/hipaa/for-professionals/security/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)

## 🏥 Healthcare-Specific Security

### PHI Protection
- Patient data encrypted at rest and in transit
- Access logging for all PHI access
- Minimum necessary principle enforced
- Audit trails maintained for 7 years

### Access Controls
- Role-based access (Doctor, Nurse, Admin, Receptionist)
- Hospital-level data isolation
- Session timeout after inactivity
- Multi-factor authentication (via Entra ID)

## ✅ Security Audit Script

Run the automated security audit:

```bash
npm run security-audit
```

This checks for:
- NPM package vulnerabilities
- Exposed secrets in code
- .gitignore configuration
- TypeScript compilation errors
- Security middleware configuration

## 🆘 Incident Response

In case of a security breach:

1. **Immediate**: Isolate affected systems
2. **Within 1 hour**: Notify security team
3. **Within 24 hours**: Assess impact and scope
4. **Within 72 hours**: Notify affected users (HIPAA/GDPR)
5. **Within 7 days**: Root cause analysis
6. **Within 30 days**: Implement preventive measures

## 📞 Contact

For security concerns:
- **Email**: [your-security-email@example.com]
- **Response time**: Within 48 hours
- **PGP Key**: [Link to PGP public key]

---

**Last Updated**: February 2026  
**Version**: 1.0.0  
**Maintained by**: HealthMesh Security Team
