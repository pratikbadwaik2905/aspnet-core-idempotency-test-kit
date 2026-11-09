# ASP.NET Core Idempotency Test Kit

A small HTTP smoke test for the ASP.NET PB order API. Run it against the tutorial's disposable local fixture to check that a client retry returns the saved order, even when the original response was lost.

[Build the ASP.NET Core and SQL Server idempotency sample](https://aspdotnetpb.blogspot.com/2026/11/idempotency-keys-aspnet-core-10-sql-server.html)

## Run the smoke test

Use Node.js 22 or later and start the tutorial's local API with its seeded catalog and demo authentication enabled. The script submits one test order for SKU `KB-01`. Use a disposable database. It accepts only loopback URLs and rejects redirects.

On PowerShell, with the same demo key you configured in the API:

```powershell
$env:BASE_URL = 'https://localhost:7045'
$env:DEMO_KEY = Read-Host 'Local demo key'
node smoke-test.mjs
Remove-Item Env:DEMO_KEY
```

For a local development certificate, configure Node to trust its public certificate before running the test. Keep certificate verification enabled. Alternatively, point `BASE_URL` at a loopback HTTP listener in the disposable fixture.

| Check | Expected result |
|---|---|
| POST with no idempotency key | 400 |
| First request with a fresh key | 201 and an order Location |
| Same key and same quantity | 201, identical body and Location, and a replay marker |
| Same key with a different quantity | 422 |

The script was checked against a local HTTP fixture. Run it against your tutorial instance to verify the ASP.NET Core and SQL Server behavior. For concurrent requests, also verify the tutorial's 409 path and retry behavior against real SQL Server. For durable event delivery after a successful order write, see the [transactional outbox guide](https://aspdotnetpb.blogspot.com/2026/11/transactional-outbox-aspnet-core-10-ef-core-rabbitmq.html).

## Troubleshooting

- **401 or 403** — Check the local demo key and authentication configuration.
- **TLS error** — Confirm the endpoint and development certificate trust.
- **Unexpected 409** — Check whether another request is processing the same key.
- **Unexpected 422** — Use a fresh UUID for each new business operation and keep the payload fixed when retrying it.
