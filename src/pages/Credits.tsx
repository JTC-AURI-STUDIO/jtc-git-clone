import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';

const plans = [
  {
    id: 'starter',
    name: 'Starter',
    price: 'R$ 29',
    credits: 100,
    features: ['100 créditos', 'Suporte via email', 'Acesso básico']
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 'R$ 99',
    credits: 500,
    features: ['500 créditos', 'Suporte prioritário', 'Acesso completo', 'Relatórios detalhados']
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'R$ 249',
    credits: 1500,
    features: ['1500 créditos', 'Gerente de conta', 'API access', 'Personalização']
  }
];

const Credits = () => {
  const navigate = useNavigate();

  const handlePurchase = (planId: string, credits: number) => {
    navigate(`/payment?plan=${planId}&credits=${credits}`);
  };

  return (
    <div className="container mx-auto py-12 px-4">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Comprar Créditos</h1>
        <p className="text-muted-foreground">Escolha o melhor plano para as suas necessidades</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {plans.map((plan) => (
          <Card key={plan.id} className="flex flex-col">
            <CardHeader>
              <CardTitle className="text-2xl">{plan.name}</CardTitle>
              <CardDescription>{plan.credits} créditos</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
              <div className="text-3xl font-bold mb-6">{plan.price}</div>
              <ul className="space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full"
                onClick={() => handlePurchase(plan.id, plan.credits)}
              >
                Comprar Agora
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Credits;
