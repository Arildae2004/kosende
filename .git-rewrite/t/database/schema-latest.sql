--
-- PostgreSQL database dump
-- KosEnde - Platform Manajemen Kos di Ende, NTT
--

-- Dumped from database version 18.4
-- Dumped by pg_dump version 18.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: listing_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.listing_status AS ENUM (
    'pending',
    'approved',
    'rejected',
    'inactive'
);


--
-- Name: payment_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.payment_status AS ENUM (
    'pending',
    'verified',
    'rejected'
);


--
-- Name: subscription_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.subscription_status AS ENUM (
    'trial',
    'active',
    'expired',
    'cancelled'
);


--
-- Name: user_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.user_role AS ENUM (
    'owner',
    'admin',
    'viewer'
);


--
-- Name: check_and_expire_subscriptions(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_and_expire_subscriptions() RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    expired_sub RECORD;
BEGIN
    -- Find subscriptions where trial/subscription has ended
    FOR expired_sub IN
        SELECT s.id, s.user_id, s.status
        FROM subscriptions s
        WHERE s.status IN ('trial', 'active')
          AND s.trial_end_date < NOW()
    LOOP
        -- Update subscription status to expired
        UPDATE subscriptions
        SET status = 'expired',
            updated_at = NOW()
        WHERE id = expired_sub.id;

        -- Deactivate all listings belonging to this user
        UPDATE listings
        SET is_active = false,
            status = 'inactive',
            updated_at = NOW()
        WHERE owner_id = expired_sub.user_id;

        -- Log the expiration
        INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
        VALUES (
            expired_sub.user_id,
            'subscription_expired',
            'subscription',
            expired_sub.id,
            jsonb_build_object('previous_status', expired_sub.status)
        );
    END LOOP;
END;
$$;


--
-- Name: create_subscription_on_user_registration(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_subscription_on_user_registration() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    INSERT INTO subscriptions (user_id, status, trial_start_date, trial_end_date)
    VALUES (
        NEW.id,
        'trial',
        NOW(),
        NOW() + INTERVAL '14 days'
    );

    INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
    VALUES (
        NEW.id,
        'subscription_created',
        'subscription',
        NEW.id,
        jsonb_build_object('status', 'trial', 'trial_end_date', NOW() + INTERVAL '14 days')
    );

    RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: activity_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activity_logs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid,
    action character varying(100) NOT NULL,
    entity_type character varying(50) NOT NULL,
    entity_id uuid,
    details jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: listings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.listings (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    owner_id uuid NOT NULL,
    location_id uuid,
    title character varying(200) NOT NULL,
    description text,
    address text NOT NULL,
    price_monthly numeric(15,2) NOT NULL,
    deposit numeric(15,2) DEFAULT 0,
    room_size character varying(50),
    facilities jsonb DEFAULT '[]'::jsonb,
    images jsonb DEFAULT '[]'::jsonb,
    status public.listing_status DEFAULT 'pending'::public.listing_status NOT NULL,
    is_active boolean DEFAULT false NOT NULL,
    approved_by uuid,
    approved_at timestamp with time zone,
    rejection_reason text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: locations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.locations (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    village character varying(100) NOT NULL,
    district character varying(100) NOT NULL,
    city character varying(100) DEFAULT 'Ende'::character varying NOT NULL,
    province character varying(100) DEFAULT 'Nusa Tenggara Timur'::character varying NOT NULL,
    postal_code character varying(10),
    latitude numeric(10,8),
    longitude numeric(11,8),
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payments (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    subscription_id uuid,
    amount numeric(15,2) NOT NULL,
    payment_method character varying(50),
    proof_url character varying(500),
    status public.payment_status DEFAULT 'pending'::public.payment_status NOT NULL,
    verified_by uuid,
    verified_at timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscriptions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    status public.subscription_status DEFAULT 'trial'::public.subscription_status NOT NULL,
    trial_start_date timestamp with time zone DEFAULT now(),
    trial_end_date timestamp with time zone DEFAULT (now() + '14 days'::interval) NOT NULL,
    subscription_start_date timestamp with time zone,
    subscription_end_date timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(100) NOT NULL,
    email character varying(150) NOT NULL,
    password_hash character varying(255) NOT NULL,
    phone character varying(20),
    role public.user_role DEFAULT 'owner'::public.user_role NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: v_active_listings; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_active_listings AS
 SELECT l.id,
    l.title,
    l.description,
    l.address,
    l.price_monthly,
    l.facilities,
    l.images,
    l.status,
    l.is_active,
    l.created_at,
    u.id AS owner_id,
    u.name AS owner_name,
    u.email AS owner_email,
    u.phone AS owner_phone,
    loc.village,
    loc.district,
    loc.city,
    loc.province
   FROM ((public.listings l
     JOIN public.users u ON ((l.owner_id = u.id)))
     LEFT JOIN public.locations loc ON ((l.location_id = loc.id)))
  WHERE ((l.is_active = true) AND (l.status = 'approved'::public.listing_status));


--
-- Name: v_subscription_overview; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_subscription_overview AS
 SELECT u.id AS user_id,
    u.name,
    u.email,
    u.phone,
    s.id AS subscription_id,
    s.status AS subscription_status,
    s.trial_start_date,
    s.trial_end_date,
    s.subscription_start_date,
    s.subscription_end_date,
        CASE
            WHEN ((s.status = 'trial'::public.subscription_status) AND (s.trial_end_date > now())) THEN (EXTRACT(day FROM (s.trial_end_date - now())))::integer
            WHEN ((s.status = 'active'::public.subscription_status) AND (s.subscription_end_date > now())) THEN (EXTRACT(day FROM (s.subscription_end_date - now())))::integer
            ELSE 0
        END AS days_remaining,
    ( SELECT count(*) AS count
           FROM public.listings
          WHERE (listings.owner_id = u.id)) AS total_listings,
    ( SELECT count(*) AS count
           FROM public.listings
          WHERE ((listings.owner_id = u.id) AND (listings.is_active = true))) AS active_listings
   FROM (public.users u
     JOIN public.subscriptions s ON ((u.id = s.user_id)))
  WHERE (u.role = 'owner'::public.user_role);


--
-- Name: activity_logs activity_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_pkey PRIMARY KEY (id);


--
-- Name: listings listings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.listings
    ADD CONSTRAINT listings_pkey PRIMARY KEY (id);


--
-- Name: locations locations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.locations
    ADD CONSTRAINT locations_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_activity_logs_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_logs_entity ON public.activity_logs USING btree (entity_type, entity_id);


--
-- Name: idx_activity_logs_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_logs_user_id ON public.activity_logs USING btree (user_id);


--
-- Name: idx_listings_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_listings_is_active ON public.listings USING btree (is_active);


--
-- Name: idx_listings_location_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_listings_location_id ON public.listings USING btree (location_id);


--
-- Name: idx_listings_owner_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_listings_owner_id ON public.listings USING btree (owner_id);


--
-- Name: idx_listings_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_listings_status ON public.listings USING btree (status);


--
-- Name: idx_payments_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_status ON public.payments USING btree (status);


--
-- Name: idx_payments_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_user_id ON public.payments USING btree (user_id);


--
-- Name: idx_subscriptions_end_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscriptions_end_date ON public.subscriptions USING btree (subscription_end_date);


--
-- Name: idx_subscriptions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscriptions_status ON public.subscriptions USING btree (status);


--
-- Name: idx_subscriptions_trial_end; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscriptions_trial_end ON public.subscriptions USING btree (trial_end_date);


--
-- Name: idx_subscriptions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscriptions_user_id ON public.subscriptions USING btree (user_id);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_role ON public.users USING btree (role);


--
-- Name: users trigger_create_subscription_on_registration; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_create_subscription_on_registration AFTER INSERT ON public.users FOR EACH ROW EXECUTE FUNCTION public.create_subscription_on_user_registration();


--
-- Name: listings update_listings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_listings_updated_at BEFORE UPDATE ON public.listings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: payments update_payments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: subscriptions update_subscriptions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: users update_users_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: activity_logs activity_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: listings listings_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.listings
    ADD CONSTRAINT listings_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- Name: listings listings_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.listings
    ADD CONSTRAINT listings_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.locations(id);


--
-- Name: listings listings_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.listings
    ADD CONSTRAINT listings_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: payments payments_subscription_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES public.subscriptions(id);


--
-- Name: payments payments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: payments payments_verified_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES public.users(id);


--
-- Name: subscriptions subscriptions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

