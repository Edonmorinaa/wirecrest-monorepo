import Grid from '@mui/material/Grid';

import { AccountBillingPlan } from './account-billing-plan';
import { AccountBillingHistory } from './account-billing-history';

// ----------------------------------------------------------------------

export function AccountBilling({ cards, plans, invoices, addressBook, subscriptionInfo, onRefresh }) {
  return (
    <Grid container spacing={5}>
      <Grid size={{ xs: 12, md: 8 }}>
        <AccountBillingPlan 
          plans={plans} 
          cardList={cards} 
          addressBook={addressBook} 
          subscriptionInfo={subscriptionInfo}
          onRefresh={onRefresh}
        />
        {/* <AccountBillingPayment cards={cards} onRefresh={onRefresh} /> */}
        {/* <AccountBillingAddress addressBook={addressBook} onRefresh={onRefresh} /> */}
      </Grid>

      <Grid size={{ xs: 12, md: 4 }}>
        <AccountBillingHistory invoices={invoices} onRefresh={onRefresh} />
      </Grid>
    </Grid>
  );
}
