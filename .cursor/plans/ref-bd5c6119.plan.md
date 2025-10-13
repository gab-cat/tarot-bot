<!-- bd5c6119-bf6e-4d6a-8b0b-293a3db50716 d4b1498e-39e5-4c5a-961b-7922bcafff07 -->
# Refactor Payments to Xendit Node SDK

## Scope

- Replace manual fetch to Xendit Invoices with `xendit-node` SDK in `convex/http.ts`.
- Keep webhook token validation flow; adjust types/mapping per SDK docs.
- Add SDK client bootstrap and env placeholders.

## Files to Change

- `package.json` (add dependency via bun: `bun add xendit-node`)
- `convex/http.ts` (refactor `/xendit/checkout` to use SDK; light type tweaks for webhook payload)
- `convex/xenditClient.ts` (new: singleton initializer for SDK)
- `docs/README.md` or `docs/QUICK_FIX_SUMMARY.md` (document env vars & test steps)
- `.env.example` (new or updated with Xendit keys)

## Key Edits

- Create client
  - `convex/xenditClient.ts` (new)
    - Minimal initializer:
      ```ts
      import Xendit from 'xendit-node';
      const secretKey = process.env.XENDIT_SECRET_KEY!;
      export const xendit = new Xendit({ secretKey });
      export const { Invoice } = xendit;
      ```

- Refactor invoice creation in `convex/http.ts`:
  - Replace manual fetch block inside `/xendit/checkout` with SDK call per docs:
    ```ts
    const created = await Invoice.create({
      externalID: externalId,
      amount,
      description,
      currency,
      successRedirectURL: successRedirect,
      failureRedirectURL: failureRedirect,
    });
    const invoiceUrl = created.invoiceUrl;
    ```

  - Remove Basic auth header construction.
  - Keep persistence via `api.payments.createPayment` unchanged.
- Webhook handler `POST /xendit/webhook`:
  - Keep `x-callback-token` validation.
  - Optionally adjust field names from snake_case to camelCase if we normalize (but we can keep reading `external_id`, `status`, `id`, `paid_at` from JSON body since Xendit posts snake_case).
  - No SDK call required; keep idempotency check.

## Environment

- Ensure the following env vars exist:
  - `XENDIT_SECRET_KEY`
  - `XENDIT_CALLBACK_TOKEN`
  - `REDIRECT_URL` (base URL for redirect composition)
- Create/update `.env.example` with placeholders.

## Validation

- Manual test flow (no server run here):
  - Create invoice via `/xendit/checkout` (SDK returns URL).
  - Webhook body mapping remains compatible (paid/expired/failed).

## References

- Xendit Node SDK Invoice docs: `https://github.com/xendit/xendit-node/blob/master/docs/Invoice.md`

### To-dos

- [ ] Add xendit-node dependency using bun
- [ ] Create convex/xenditClient.ts exposing Invoice
- [ ] Use Invoice.create in /xendit/checkout route
- [ ] Confirm webhook payload mapping and keep token validation
- [ ] Add env placeholders and update docs with setup notes