
-- App role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'standard');

-- Companies table (tenants)
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Profiles table (linked to auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  role app_role NOT NULL DEFAULT 'standard',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check role (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Get company_id for a user (security definer to avoid recursion)
CREATE OR REPLACE FUNCTION public.get_user_company_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.profiles WHERE user_id = _user_id LIMIT 1
$$;

-- Companies RLS: users can only see their own company
CREATE POLICY "Users can view own company"
  ON public.companies FOR SELECT TO authenticated
  USING (id = public.get_user_company_id(auth.uid()));

-- Profiles RLS
CREATE POLICY "Users can view profiles in their company"
  ON public.profiles FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can update any profile in company"
  ON public.profiles FOR UPDATE TO authenticated
  USING (
    company_id = public.get_user_company_id(auth.uid())
    AND public.has_role(auth.uid(), 'admin')
  );

-- Allow insert during signup (the trigger handles this)
CREATE POLICY "Allow insert for new users"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Coverage assignments table
CREATE TABLE public.coverage_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id TEXT NOT NULL,
  covered_by_employee_id TEXT NOT NULL,
  original_role TEXT NOT NULL,
  cover_role TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT 'lunch',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.coverage_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view coverage in their company"
  ON public.coverage_assignments FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Admins can insert coverage in their company"
  ON public.coverage_assignments FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Admins can update coverage in their company"
  ON public.coverage_assignments FOR UPDATE TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()));

-- Audit log table
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  user_name TEXT NOT NULL DEFAULT '',
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view audit log in their company"
  ON public.audit_log FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Authenticated can insert audit log in their company"
  ON public.audit_log FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

-- Trigger: auto-create profile on signup
-- The user must pass company_name in raw_user_meta_data during signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _company_id UUID;
  _company_name TEXT;
  _full_name TEXT;
BEGIN
  _company_name := NEW.raw_user_meta_data->>'company_name';
  _full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', '');

  IF _company_name IS NOT NULL AND _company_name <> '' THEN
    INSERT INTO public.companies (name) VALUES (_company_name) RETURNING id INTO _company_id;
    INSERT INTO public.profiles (user_id, company_id, full_name, role)
    VALUES (NEW.id, _company_id, _full_name, 'admin');
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
