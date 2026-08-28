-- Insert initial privacy notice
INSERT INTO privacy_notices (version, title, content, effective_date, is_current)
VALUES (
  '1.0',
  'Mushagashe Vocational Training Centre Privacy Notice',
  'PRIVACY NOTICE

Mushagashe Vocational Training Centre ("MVTC", "we", "our", or "us") is committed to protecting your personal data in accordance with Zimbabwe''s Cyber and Data Protection Act [Chapter 11:13] and POTRAZ guidance.

1. DATA CONTROLLER INFORMATION
- Name: Mushagashe Vocational Training Centre
- Contact: dpo@mushagashe.edu
- Address: [Insert Physical Address]

2. PERSONAL DATA WE COLLECT
We collect the following personal data:
- Personal Information: Full name, date of birth, national ID, gender
- Contact Information: Email address, phone number, physical address
- Academic Information: Student number, course enrollment, academic results
- Financial Information: Fee records, payment history
- Guardian Information (for minors): Guardian name, guardian phone, relationship
- Technical Information: IP address, device information, browser type

3. PURPOSES OF PROCESSING
We process your personal data for:
- Student registration and enrollment
- Academic administration and record keeping
- Fee management and financial administration
- Communication regarding academic matters
- Compliance with legal and regulatory requirements
- Security and fraud prevention
- System administration and maintenance

4. LEGAL BASIS FOR PROCESSING
We process your personal data based on:
- Your consent where required
- Performance of a contract (education services)
- Legal obligation (regulatory compliance)
- Legitimate interests (educational administration)

5. DATA SHARING
We may share your data with:
- Internal staff for educational administration
- Regulatory authorities as required by law
- Service providers (e.g., cloud storage, payment processors)
- Guardian information for minors

We do not sell your personal data to third parties.

6. DATA RETENTION
We retain your personal data for:
- Academic records: 10 years after graduation
- Financial records: 7 years
- Administrative records: 5 years
- Audit logs: 5 years

7. YOUR DATA SUBJECT RIGHTS
Under the Cyber and Data Protection Act, you have the right to:
- Access your personal data
- Request correction of inaccurate data
- Request deletion of your data (where legally permissible)
- Object to processing
- Data portability
- Withdraw consent

To exercise these rights, contact: dpo@mushagashe.edu

8. DATA SECURITY
We implement appropriate technical and organizational measures to protect your data, including:
- Encryption of data in transit and at rest
- Access controls and authentication
- Regular security assessments
- Staff training on data protection

9. COOKIES AND TRACKING
We use cookies for:
- Session management
- Authentication
- Analytics

You can manage cookie preferences through your browser settings.

10. CHANGES TO THIS NOTICE
We will notify you of material changes to this privacy notice via email or through the portal.

11. CONTACT INFORMATION
For privacy-related inquiries:
- Data Protection Officer: dpo@mushagashe.edu
- Phone: [Insert Phone Number]
- Address: [Insert Physical Address]

Last Updated: [Current Date]
Version: 1.0',
  NOW(),
  true
);
