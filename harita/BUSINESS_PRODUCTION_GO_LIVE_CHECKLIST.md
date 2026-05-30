# BUSINESS + PRODUCTION GO-LIVE CHECKLIST -- TRACKNOV

## 1. Product Readiness (Hard Gate)

-   [ ] End-to-end flow validated (create → upload → review → export)
-   [ ] No P1 defects
-   [ ] Workflow + RBAC enforced
-   [ ] Dashboard accuracy validated

## 2. Production Environment

-   [ ] Domain mapped (e.g., app.tracknov.com)
-   [ ] SSL active (HTTPS enforced)
-   [ ] Supabase production DB stable
-   [ ] Automated DB backups enabled
-   [ ] Restore tested
-   [ ] Monitoring enabled (uptime, API errors)
-   [ ] Alerting configured (email/Slack)

## 3. Security & Compliance

-   [ ] Secrets stored securely (no hardcoding)
-   [ ] API keys rotated
-   [ ] Role-based access audit completed
-   [ ] Data isolation verified
-   [ ] Privacy Policy published
-   [ ] Terms of Service published
-   [ ] DPA ready

## 4. Commercial Readiness

-   [ ] Pricing model finalized
-   [ ] Billing workflow defined
-   [ ] Invoice generation system ready
-   [ ] GST/tax compliance configured
-   [ ] Refund policy defined

## 5. Support Readiness

-   [ ] Onboarding guide ready
-   [ ] Support channel defined
-   [ ] SLA defined
-   [ ] Incident response owner assigned
-   [ ] Issue logging standardized

## 6. Pilot Evidence

-   [ ] 1--2 real client projects executed
-   [ ] Full flow completed
-   [ ] Metrics tracked:
    -   Completion time
    -   Rejection rate
    -   Token usage
-   [ ] Feedback documented
-   [ ] Issues resolved

## 7. Data Integrity & Audit

-   [ ] Project → Credit → Document mapping verified
-   [ ] No orphan data
-   [ ] Token ledger reconciled
-   [ ] Audit logs capturing all actions

## 8. Risk & Rollback Control

-   [ ] Rollback plan ready
-   [ ] Previous stable build identified
-   [ ] DB restore tested
-   [ ] Access restriction mechanism ready

## 9. Monitoring (Day 0--7)

-   [ ] Daily health check
-   [ ] Track errors, upload failures, workflow breaks
-   [ ] Fix P1 issues immediately

## 10. Internal Alignment

-   [ ] Team roles locked
-   [ ] Responsibilities clearly defined
-   [ ] Communication protocol established

## GO / NO-GO RULE

Go live ONLY if all above are complete and approved.
