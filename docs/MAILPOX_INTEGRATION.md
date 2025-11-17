# Mailpox Integration Guide

## Overview

Mailpox is an email-based content editing system that replaces the traditional web-based admin interface. It allows content editors to update website content by sending emails to a dedicated address, which are then processed by AI and automatically applied to the database.

## System Architecture

### Workflow Overview
1. **Email Reception**: Editor sends email to dedicated edit address
2. **Webhook Processing**: Resend webhook triggers content analysis
3. **AI Analysis**: Anthropic Claude analyzes email content and intent
4. **Database Update**: Changes are applied to PostgreSQL database
5. **Confirmation**: Editor receives email confirmation of changes
6. **Site Rebuild**: Static site is rebuilt with updated content

### Security Layers
1. **Webhook Signature Verification** - Ensures requests come from Resend
2. **Email Address Verification** - Only allows emails from authorized senders
3. **Edit Address Verification** - Confirms email was sent to correct address
4. **Secret Token Verification** - Requires secret token in email subject/body

## Configuration

### Environment Variables
```bash
# Email Configuration
EDIT_EMAIL_ADDRESS=edit@aimuseum.se
EDIT_FINAL_MAILBOX=admin@aimuseum.se
ALLOWED_EDITOR_EMAILS=editor1@example.com,editor2@example.com
EDIT_SECRET_TOKEN=your-secret-token-here

# API Keys
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxx
RESEND_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxx
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxx

# Optional Features
TRIGGER_REBUILD=true        # Set to false to disable automatic rebuilds
EXPORT_DB_AFTER_EDIT=true   # Runs `npm run export-db` after each edit (set false to skip)
WEBHOOK_TEST_MODE=false     # Set to true to bypass signature verification
```

### Resend Configuration
1. Create a Resend account and verify your domain
2. Set up email receiving for your domain
3. Configure webhook URL: `https://yourdomain.com/api/webhook/email`
4. Set webhook secret in environment variables

## Usage Guide

### Basic Email Format
Send emails to: `edit@aimuseum.se`

**Subject Format:**
```
[SECRET_TOKEN] Edit request for [page section]
```

**Body Format:**
```
[page.home.hero.title]
Update the hero title to be more engaging and modern
[/page.home.hero.title]
```

### Advanced Email Formats

#### Direct Key Specification
```
[page.about.mission.statement]
Our mission is to democratize AI education and make artificial intelligence accessible to everyone through engaging exhibitions and educational programs.
[/page.about.mission.statement]
```

#### Natural Language Requests
```
Please update the contact page phone number to +46 70 123 45 67 and add a note that we're available Monday-Friday 9-17.
```

#### Multiple Changes
```
[page.home.hero.subtitle]
Discover the future of artificial intelligence through interactive exhibits and cutting-edge demonstrations.
[/page.home.hero.subtitle]

[page.home.features.intro]
Explore our three main exhibition areas: AI History, Current Applications, and Future Possibilities.
[/page.home.features.intro]
```

### Supported Content Types

#### Text Snippets
- Page titles and headings
- Paragraph content
- Button labels
- Metadata descriptions

#### Media References
- Image captions and alt text
- Video descriptions
- Document titles

#### Encyclopedia Entries
- Term definitions
- Historical context
- Technical explanations

## AI Processing

### Content Analysis
The system uses Anthropic Claude to:
- Parse natural language edit requests
- Identify the correct database keys to update
- Generate appropriate content for the context
- Maintain consistent tone and style
- Handle bilingual content (EN/SV) appropriately

### Confidence Scoring
Each edit receives a confidence score:
- **High (90-100%)**: Clear instructions, exact key matches
- **Medium (70-89%)**: Good understanding, some interpretation needed
- **Low (<70%)**: Ambiguous request, may require clarification

## Error Handling

### Common Issues

#### Invalid Email Address
**Error**: "Unauthorized sender"
**Solution**: Add sender email to ALLOWED_EDITOR_EMAILS

#### Missing Secret Token
**Error**: "Secret token required"
**Solution**: Include secret token in email subject or body

#### Invalid Webhook Signature
**Error**: "Invalid signature"
**Solution**: Check RESEND_WEBHOOK_SECRET configuration

#### Database Connection Issues
**Error**: Database connection failures
**Solution**: System continues with graceful degradation

### Troubleshooting

1. **Check email headers** for proper routing
2. **Verify webhook delivery** in Resend dashboard
3. **Review server logs** for detailed error information
4. **Test with WEBHOOK_TEST_MODE=true** for development

## API Endpoints

### Webhook Endpoint
- **URL**: `/api/webhook/email`
- **Method**: POST
- **Content-Type**: application/json
- **Authentication**: Resend webhook signature

### Test Endpoint
- **URL**: `/api/webhook/email/test`
- **Method**: GET
- **Purpose**: Verify configuration and security settings

## Integration Points

### Database Schema
Mailpox integrates with the existing PostgreSQL schema:

```sql
-- text_snippets table
CREATE TABLE text_snippets (
    key VARCHAR(255) PRIMARY KEY,
    lang VARCHAR(2) NOT NULL,
    body TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### Export System
- Database content exported to JSON files in `/public/db/`
- Static site rebuilds incorporate updated content
- Fallback to JSON files if database unavailable

### Email Infrastructure
- Uses existing EmailJS configuration for contact forms
- Adds Resend for email receiving and sending
- Maintains security and rate limiting

## Best Practices

### For Content Editors
1. **Be specific** in edit requests
2. **Use the key format** when possible for precise edits
3. **Include context** for natural language requests
4. **Test changes** after confirmation
5. **Keep the secret token** secure

### For Developers
1. **Monitor webhook deliveries** in Resend dashboard
2. **Review AI confidence scores** for quality control
3. **Maintain backup** of database content
4. **Test with sample emails** before production use
5. **Keep environment variables** secure and rotated

## Migration from Admin UI

### Changes Made
- Removed web-based admin interface
- Disabled database admin API endpoints
- Implemented email webhook processing
- Added AI-powered content analysis
- Enhanced security with multi-layer verification

### Benefits
- **Simplified workflow**: Edit via email instead of web interface
- **Enhanced security**: Multi-factor email verification
- **AI assistance**: Smart content analysis and application
- **Audit trail**: Natural email record of all changes
- **Reduced maintenance**: No admin UI to maintain

## Future Enhancements

### Planned Features
- **Batch processing** for multiple email edits
- **Content versioning** with rollback capability
- **Advanced AI templates** for common edit types
- **Integration with CMS** for complex content structures
- **Multi-language support** beyond EN/SV

### Integration Opportunities
- **Slack/Teams notifications** for edit confirmations
- **GitHub integration** for content version control
- **Analytics tracking** for edit frequency and types
- **Content scheduling** for timed publications
- **A/B testing** support for content variations

## Support

For issues with Mailpox integration:
1. Check server logs for error details
2. Verify environment variable configuration
3. Test with the `/api/webhook/email/test` endpoint
4. Contact development team with specific error messages

This documentation will be updated as the Mailpox system evolves and new features are added.
