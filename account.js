// Account access is optional; calculation, history and notes remain local.
async function mountAccount() {
  const { createAccountContext, mountSiteAccount } = await import('https://softm.github.io/shared/platform/v1/site-account.mjs?v=20261030-menu-1');
  const account = createAccountContext({ siteId: 'calc' });
  mountSiteAccount({ siteId: 'calc', name: '계산기', target: '.header-actions', account });
}
mountAccount().catch(() => { /* A network failure must not interrupt local calculations. */ });
