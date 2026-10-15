# FeeLens NG administration guide

The administration application is for authorised FeeLens management users. It is not visible to public users, and it has no public registration flow. Examples below are generic and must not be treated as government records.

## Log in and session expiry

Open `/admin/login` and use a previously provisioned administrator account. A successful login rotates the server-side session. If the session expires or the account becomes inactive, protected requests return an authentication response and the interface returns to login. Use Log out when finished; logout destroys the server-side session and clears the cookie.

## Recommended empty-database workflow

1. Create an MDA.
2. Create a service under that MDA.
3. Create one or more fee options for the service.
4. Create authoritative source records and attach them to each relevant fee.
5. Record a verification decision with its evidence summary and method.
6. Add the official service channel.

No seed data is required. Do not create realistic-looking records merely to fill the interface.

## Add an MDA

Choose **MDAs → Add MDA**. Enter a unique URL-safe slug, public identity fields, coverage state and active state. Inactivation is the preferred archive mechanism; the normal administration API does not casually hard-delete MDAs or their history.

## Add a service

Choose **Services → Add service**, select the parent MDA and add the service identity. Requirements and process steps use repeatable rows, including ordering controls, so administrators do not edit raw JSON.

## Add and validate a fee

Choose **Fee options → Add fee** and select the service and pricing model. The form adapts by model:

- fixed — currency and amount;
- free — no numeric amount;
- range — currency, minimum and maximum;
- percentage — percentage and explanatory conditions where needed;
- formula — calculation explanation;
- variable — conditions plus a useful label or note;
- unknown — no numeric amount and never zero.

Foreign currencies remain in their published currency; FeeLens does not automatically convert them to NGN. A service can have several fee options.

## Attach evidence

Create a source under **Sources** once, then open the fee editor and attach it. Several sources can support a fee and one source can support several fees. Unlinking removes only the relationship; it does not delete the source record.

## Record verification

Open **Verifications** and select the service, optional fee, status, evidence summary, method, date and source. The server derives the reviewer from the authenticated session. Verification history is chronological and append-only in the normal UI. Conflicting evidence must be recorded as conflicting rather than silently choosing one amount.

## Replace an official fee

Open the current fee editor and use **Fee change / supersession**. Review the current record, enter the replacement model/amount, select authoritative sources, explain the change and record the review method. On success the backend atomically:

1. marks the previous fee non-current and superseded;
2. creates the replacement linked to the previous record;
3. links its evidence;
4. creates a verification event;
5. writes audit entries.

Do not overwrite an old verified amount when historical integrity matters.

## Official channels

Open **Official channels**, select the service and record only a confirmed official portal, page, office, email, phone or other channel. Mark obsolete channels inactive instead of deleting history.

## Formal correspondence and FOI

Use **Formal requests** only when the normal evidence hierarchy is insufficient. Associate the request with a service and track the schema-supported states: draft, submitted, acknowledged, responded, closed or withdrawn. FOI is an exception workflow, not the default source route.

## Audit history

**Audit history** is read-only and newest first. Expand an entry to inspect sanitised old/new values. Passwords, hashes, sessions and secrets must never appear. If they do, stop using the affected workflow and report it privately.

## Administrator management and account security

Existing administrators can create another administrator with a strong temporary password, edit display names, and activate/deactivate accounts. Password hashes are never displayed. The server prevents self-deactivation and prevents leaving the system with zero active administrators.

Use **My account** to update your own display name or change password. Password change verifies the current password, rotates the current session and invalidates other sessions for that account.
