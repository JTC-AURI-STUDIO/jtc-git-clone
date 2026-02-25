
-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  name TEXT NOT NULL DEFAULT '',
  cpf TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Credits table
CREATE TABLE public.credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  balance INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own credits" ON public.credits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own credits" ON public.credits FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own credits" ON public.credits FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Payments table
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  credits_purchased INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payments" ON public.payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own payments" ON public.payments FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Remixes table
CREATE TABLE public.remixes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_repo TEXT NOT NULL,
  destination_repo TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'processing',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.remixes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own remixes" ON public.remixes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own remixes" ON public.remixes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own remixes" ON public.remixes FOR UPDATE USING (auth.uid() = user_id);

-- Trigger for auto-creating profile and credits on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name) VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', ''));
  INSERT INTO public.credits (user_id, balance) VALUES (NEW.id, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_credits_updated_at BEFORE UPDATE ON public.credits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
