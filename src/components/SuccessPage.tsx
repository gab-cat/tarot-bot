import { useSearchParams } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, CreditCard, Zap, Calendar, BadgeCheck, Loader2, Sparkles, Star } from 'lucide-react';

const SuccessPage = () => {
  const [searchParams] = useSearchParams();
  const externalId = searchParams.get('external_id');
  
  // Call hooks unconditionally
  const payment = useQuery(api.payments.getPaymentByExternalId, 
    externalId ? { externalId } : "skip"
  );

  if (!externalId) {
    return (
      <div className="min-h-screen w-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md border-destructive/20">
          <CardHeader className="text-center space-y-4">
            <CheckCircle className="h-16 w-16 text-destructive mx-auto" />
            <CardTitle className="text-2xl text-destructive">Error</CardTitle>
            <CardDescription className="text-base">No external ID provided.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (payment === undefined) {
    return (
      <div className="min-h-screen w-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md border-primary/20">
          <CardHeader className="text-center space-y-4">
            <Loader2 className="h-16 w-16 text-primary mx-auto animate-spin" />
            <CardTitle className="text-2xl">Loading</CardTitle>
            <CardDescription className="text-base">Loading payment details...</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!payment || payment.status !== 'PAID') {
    return (
      <div className="min-h-screen w-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md border-destructive/20">
          <CardHeader className="text-center space-y-4">
            <CheckCircle className="h-16 w-16 text-destructive mx-auto" />
            <CardTitle className="text-2xl text-destructive">Payment Not Found</CardTitle>
            <CardDescription className="text-base">Could not retrieve payment details or payment not successful.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const paidDate = payment.paidAt ? new Date(payment.paidAt).toLocaleDateString() : new Date(payment.createdAt).toLocaleDateString();

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-violet-50/20 p-4 relative overflow-hidden">
      {/* Decorative celestial elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <Star className="absolute top-20 left-20 w-4 h-4 text-violet-300/40" />
        <Star className="absolute top-32 right-32 w-3 h-3 text-violet-400/30" />
        <Star className="absolute bottom-40 left-40 w-3 h-3 text-violet-300/40" />
        <Star className="absolute bottom-24 right-24 w-4 h-4 text-violet-400/30" />
        <Sparkles className="absolute top-1/4 right-16 w-5 h-5 text-violet-300/30" />
        <Sparkles className="absolute bottom-1/3 left-16 w-5 h-5 text-violet-400/30" />
      </div>

      <div className="w-full max-w-4xl mx-auto relative z-10">
        <Card className="w-full bg-white border-violet-200 animate-fade-in">
          <CardHeader className="text-center pb-10 pt-12 space-y-6">
            <div className="flex justify-center mb-2">
              <div className="relative">
                <CheckCircle className="h-24 w-24 text-violet-500" />
                <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-violet-500" />
              </div>
            </div>
            <div className="space-y-3">
              <CardTitle className="text-5xl font-bold text-violet-600">
                Payment Successful!
              </CardTitle>
              <CardDescription className="text-lg max-w-2xl mx-auto leading-relaxed text-slate-600">
                Your <span className="font-semibold text-violet-600 capitalize">{payment.plan}</span> subscription has been activated. Return to Messenger to start your mystical journey.
              </CardDescription>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-8 pb-12">
            <div className="grid md:grid-cols-2 gap-4 max-w-3xl mx-auto">
              <div className="p-5 bg-violet-50 rounded-lg border border-violet-200">
                <div className="flex items-center gap-3 mb-2">
                  <CreditCard className="h-5 w-5 text-violet-600" />
                  <p className="text-sm font-medium text-slate-600">Amount Paid</p>
                </div>
                <p className="text-3xl font-bold text-slate-900 ml-8">{payment.amount.toLocaleString()} {payment.currency}</p>
              </div>

              <div className="p-5 bg-purple-50 rounded-lg border border-purple-200">
                <div className="flex items-center gap-3 mb-2">
                  <Zap className="h-5 w-5 text-purple-600" />
                  <p className="text-sm font-medium text-slate-600">Plan Activated</p>
                </div>
                <p className="text-2xl font-bold capitalize text-slate-900 ml-8">{payment.plan}</p>
              </div>

              <div className="p-5 bg-indigo-50 rounded-lg border border-indigo-200">
                <div className="flex items-center gap-3 mb-2">
                  <Calendar className="h-5 w-5 text-indigo-600" />
                  <p className="text-sm font-medium text-slate-600">Transaction Date</p>
                </div>
                <p className="text-xl font-semibold text-slate-900 ml-8">{paidDate}</p>
              </div>

              <div className="p-5 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-3 mb-2">
                  <BadgeCheck className="h-5 w-5 text-green-600" />
                  <p className="text-sm font-medium text-slate-600">Status</p>
                </div>
                <div className="ml-8">
                  <Badge variant="default" className="bg-green-500 hover:bg-green-600 text-white">Paid</Badge>
                </div>
              </div>
            </div>

            <div className="max-w-md mx-auto pt-4">
              <Button 
                onClick={() => window.open('https://www.facebook.com/profile.php?id=61581609587748#', '_blank')} 
                className="w-full h-14 text-lg font-semibold bg-violet-600 hover:bg-violet-700 text-white"
              >
                Return to Messenger
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <style>
        {`
          @keyframes fade-in {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-fade-in {
            animation: fade-in 0.6s ease-out;
          }
        `}
      </style>
    </div>
  );
};

export default SuccessPage;
