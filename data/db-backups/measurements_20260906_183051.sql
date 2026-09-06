--
-- PostgreSQL database dump
--

-- Dumped from database version 16.4
-- Dumped by pg_dump version 16.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: measurements; Type: TABLE; Schema: public; Owner: shop
--

CREATE TABLE public.measurements (
    id integer NOT NULL,
    "runId" character varying(64) NOT NULL,
    platform public."Platform" NOT NULL,
    scenario public."Scenario" NOT NULL,
    metric public."MetricType" NOT NULL,
    iteration integer NOT NULL,
    value double precision NOT NULL,
    unit character varying(8) NOT NULL,
    "deviceModel" character varying(80),
    "osVersion" character varying(40),
    "buildType" public."BuildType",
    "appVersion" character varying(20),
    "serverMs" double precision,
    extra jsonb,
    "recordedAt" timestamp(3) with time zone NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.measurements OWNER TO shop;

--
-- Name: measurements_id_seq; Type: SEQUENCE; Schema: public; Owner: shop
--

CREATE SEQUENCE public.measurements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.measurements_id_seq OWNER TO shop;

--
-- Name: measurements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: shop
--

ALTER SEQUENCE public.measurements_id_seq OWNED BY public.measurements.id;


--
-- Name: measurements id; Type: DEFAULT; Schema: public; Owner: shop
--

ALTER TABLE ONLY public.measurements ALTER COLUMN id SET DEFAULT nextval('public.measurements_id_seq'::regclass);


--
-- Data for Name: measurements; Type: TABLE DATA; Schema: public; Owner: shop
--

COPY public.measurements (id, "runId", platform, scenario, metric, iteration, value, unit, "deviceModel", "osVersion", "buildType", "appVersion", "serverMs", extra, "recordedAt", "createdAt") FROM stdin;
1	run_dev	REACT_NATIVE	S1	STARTUP_MS	1	4348.758	ms	nieznane	nieznane	DEBUG	1.0.0	131.691	{"listSize": 30}	2026-09-06 15:40:28.216+02	2026-09-06 15:41:00.799+02
2	run_dev	REACT_NATIVE	S2	UI_RESPONSE_MS	1	356.613	ms	nieznane	nieznane	DEBUG	1.0.0	38.378	{"serviceId": "srv_002"}	2026-09-06 15:40:47.6+02	2026-09-06 15:41:00.799+02
3	run_dev	REACT_NATIVE	S3	UI_RESPONSE_MS	1	0.029	ms	nieznane	nieznane	DEBUG	1.0.0	\N	{"faza": "przygotowanie"}	2026-09-06 15:40:51.856+02	2026-09-06 15:41:00.799+02
4	run_dev	REACT_NATIVE	S3	API_REQUEST_MS	1	129.474	ms	nieznane	nieznane	DEBUG	1.0.0	75.983	{"faza": "siec_plus_serwer", "totalMs": 126.66092300415039}	2026-09-06 15:40:51.86+02	2026-09-06 15:41:00.799+02
5	run_dev	REACT_NATIVE	S3	RENDER_MS	1	528.521	ms	nieznane	nieznane	DEBUG	1.0.0	\N	{"faza": "render_po_odpowiedzi"}	2026-09-06 15:40:52.385+02	2026-09-06 15:41:00.799+02
6	run_dev	REACT_NATIVE	S3	RENDER_MS	2	352.003	ms	nieznane	nieznane	DEBUG	1.0.0	29.079	{"count": 4, "ekran": "historia"}	2026-09-06 15:40:52.683+02	2026-09-06 15:41:00.799+02
7	run_dev	REACT_NATIVE	S1	STARTUP_MS	2	4601.726	ms	nieznane	nieznane	DEBUG	1.0.0	23.257	{"listSize": 30}	2026-09-06 15:43:26.972+02	2026-09-06 15:43:32.594+02
8	run_dev	REACT_NATIVE	S1	STARTUP_MS	3	4219.237	ms	nieznane	nieznane	DEBUG	1.0.0	26.03	{"listSize": 30}	2026-09-06 15:43:48.239+02	2026-09-06 15:43:51.981+02
9	run_dev	REACT_NATIVE	S1	STARTUP_MS	4	4481.242	ms	nieznane	nieznane	DEBUG	1.0.0	27.434	{"listSize": 30}	2026-09-06 15:44:07.977+02	2026-09-06 15:44:11.98+02
10	run_dev	REACT_NATIVE	S1	STARTUP_MS	5	4247.95	ms	nieznane	nieznane	DEBUG	1.0.0	25.064	{"listSize": 30}	2026-09-06 15:44:26.998+02	2026-09-06 15:44:30.688+02
11	run_dev	REACT_NATIVE	S1	STARTUP_MS	6	4163.433	ms	nieznane	nieznane	DEBUG	1.0.0	28.523	{"listSize": 30}	2026-09-06 15:44:46.011+02	2026-09-06 15:44:50.123+02
12	run_dev	REACT_NATIVE	S1	STARTUP_MS	7	4160.294	ms	nieznane	nieznane	DEBUG	1.0.0	25.787	{"listSize": 30}	2026-09-06 15:45:05.824+02	2026-09-06 15:45:09.473+02
13	run_dev	REACT_NATIVE	S1	STARTUP_MS	8	4331.993	ms	nieznane	nieznane	DEBUG	1.0.0	24.256	{"listSize": 30}	2026-09-06 15:45:25.255+02	2026-09-06 15:45:29.223+02
14	run_dev	REACT_NATIVE	S1	STARTUP_MS	9	4283.974	ms	nieznane	nieznane	DEBUG	1.0.0	22.097	{"listSize": 30}	2026-09-06 15:45:44.817+02	2026-09-06 15:45:48.383+02
15	run_dev	REACT_NATIVE	S1	STARTUP_MS	10	4160.677	ms	nieznane	nieznane	DEBUG	1.0.0	19.691	{"listSize": 30}	2026-09-06 15:46:03.259+02	2026-09-06 15:46:06.678+02
16	run_dev	REACT_NATIVE	S1	STARTUP_MS	11	4306.832	ms	nieznane	nieznane	DEBUG	1.0.0	22.541	{"listSize": 30}	2026-09-06 15:46:21.382+02	2026-09-06 15:46:25.918+02
17	run_dev	REACT_NATIVE	S1	STARTUP_MS	12	4242.336	ms	nieznane	nieznane	DEBUG	1.0.0	31.907	{"listSize": 30}	2026-09-06 15:46:40.918+02	2026-09-06 15:46:44.785+02
18	run_dev	REACT_NATIVE	S1	STARTUP_MS	13	4572.212	ms	nieznane	nieznane	DEBUG	1.0.0	25.653	{"listSize": 30}	2026-09-06 15:47:00.919+02	2026-09-06 15:47:04.402+02
19	run_dev	REACT_NATIVE	S1	STARTUP_MS	14	4303.37	ms	nieznane	nieznane	DEBUG	1.0.0	49.829	{"listSize": 30}	2026-09-06 15:47:19.953+02	2026-09-06 15:47:23.723+02
20	run_dev	REACT_NATIVE	S1	STARTUP_MS	15	4199.227	ms	nieznane	nieznane	DEBUG	1.0.0	20.134	{"listSize": 30}	2026-09-06 15:47:38.287+02	2026-09-06 15:47:41.865+02
21	run_dev	REACT_NATIVE	S1	STARTUP_MS	16	9542.47	ms	nieznane	nieznane	DEBUG	1.0.0	52.89	{"listSize": 30}	2026-09-06 15:48:01.855+02	2026-09-06 15:48:07.091+02
22	run_dev	REACT_NATIVE	S1	STARTUP_MS	17	4859.201	ms	nieznane	nieznane	DEBUG	1.0.0	28.787	{"listSize": 30}	2026-09-06 15:48:22.886+02	2026-09-06 15:48:26.952+02
23	run_dev	REACT_NATIVE	S1	STARTUP_MS	18	4440.519	ms	nieznane	nieznane	DEBUG	1.0.0	19.32	{"listSize": 30}	2026-09-06 15:48:42.206+02	2026-09-06 15:48:45.764+02
24	run_dev	REACT_NATIVE	S1	STARTUP_MS	19	4389.436	ms	nieznane	nieznane	DEBUG	1.0.0	18.352	{"listSize": 30}	2026-09-06 15:49:00.724+02	2026-09-06 15:49:04.184+02
25	run_dev	REACT_NATIVE	S1	STARTUP_MS	20	4691.173	ms	nieznane	nieznane	DEBUG	1.0.0	39.667	{"listSize": 30}	2026-09-06 15:49:20.311+02	2026-09-06 15:49:23.712+02
26	run_dev	REACT_NATIVE	S1	STARTUP_MS	21	4280.123	ms	nieznane	nieznane	DEBUG	1.0.0	35.029	{"listSize": 30}	2026-09-06 15:49:39.238+02	2026-09-06 15:49:43.088+02
27	run_dev	REACT_NATIVE	S1	STARTUP_MS	22	4254.824	ms	nieznane	nieznane	DEBUG	1.0.0	26.326	{"listSize": 30}	2026-09-06 15:49:58.511+02	2026-09-06 15:50:02.641+02
28	run_dev	REACT_NATIVE	S1	STARTUP_MS	23	4453.227	ms	nieznane	nieznane	DEBUG	1.0.0	54.938	{"listSize": 30}	2026-09-06 15:50:18.14+02	2026-09-06 15:50:21.706+02
29	run_dev	REACT_NATIVE	S1	STARTUP_MS	24	4259.492	ms	nieznane	nieznane	DEBUG	1.0.0	25.144	{"listSize": 30}	2026-09-06 15:50:37.452+02	2026-09-06 15:50:40.791+02
30	run_dev	REACT_NATIVE	S1	STARTUP_MS	25	4358.967	ms	nieznane	nieznane	DEBUG	1.0.0	33.81	{"listSize": 30}	2026-09-06 15:50:56.043+02	2026-09-06 15:51:00.043+02
31	run_dev	REACT_NATIVE	S1	STARTUP_MS	26	4248.951	ms	nieznane	nieznane	DEBUG	1.0.0	28.065	{"listSize": 30}	2026-09-06 15:51:15.831+02	2026-09-06 15:51:19.279+02
32	run_dev	REACT_NATIVE	S1	STARTUP_MS	27	4219.185	ms	nieznane	nieznane	DEBUG	1.0.0	31.9	{"listSize": 30}	2026-09-06 15:51:34.884+02	2026-09-06 15:51:38.986+02
33	run_dev	REACT_NATIVE	S1	STARTUP_MS	28	4311.199	ms	nieznane	nieznane	DEBUG	1.0.0	25.566	{"listSize": 30}	2026-09-06 15:51:53.863+02	2026-09-06 15:51:57.401+02
34	run_dev	REACT_NATIVE	S1	STARTUP_MS	29	4220.897	ms	nieznane	nieznane	DEBUG	1.0.0	39.402	{"listSize": 30}	2026-09-06 15:52:12.74+02	2026-09-06 15:52:16.218+02
35	run_dev	REACT_NATIVE	S1	STARTUP_MS	30	4160.891	ms	nieznane	nieznane	DEBUG	1.0.0	24.473	{"listSize": 30}	2026-09-06 15:52:31.312+02	2026-09-06 15:52:34.783+02
36	run_dev	REACT_NATIVE	S1	STARTUP_MS	31	4323.008	ms	nieznane	nieznane	DEBUG	1.0.0	22.003	{"listSize": 30}	2026-09-06 15:52:49.299+02	2026-09-06 15:52:53.406+02
\.


--
-- Name: measurements_id_seq; Type: SEQUENCE SET; Schema: public; Owner: shop
--

SELECT pg_catalog.setval('public.measurements_id_seq', 36, true);


--
-- Name: measurements measurements_pkey; Type: CONSTRAINT; Schema: public; Owner: shop
--

ALTER TABLE ONLY public.measurements
    ADD CONSTRAINT measurements_pkey PRIMARY KEY (id);


--
-- Name: measurements_runId_platform_scenario_metric_idx; Type: INDEX; Schema: public; Owner: shop
--

CREATE INDEX "measurements_runId_platform_scenario_metric_idx" ON public.measurements USING btree ("runId", platform, scenario, metric);


--
-- PostgreSQL database dump complete
--

