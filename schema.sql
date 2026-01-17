
-- Enable Realtime for all tables
alter publication supabase_realtime add table rooms;
alter publication supabase_realtime add table players;

-- Table: questions
create table questions (
  id serial primary key,
  theme text not null,
  question_text text not null,
  answers jsonb not null
);

-- Table: rooms
create table rooms (
  id uuid default gen_random_uuid() primary key,
  code text unique not null,
  status text default 'LOBBY', -- 'LOBBY', 'GAME'
  team_a_name text default 'Famille A',
  team_b_name text default 'Famille B',
  team_a_score int default 0,
  team_b_score int default 0,
  current_strikes int default 0,
  points_in_bank int default 0,
  active_team text check (active_team in ('A', 'B')),
  timer_ends_at timestamptz,
  current_round_question_id int references questions(id),
  revealed_answers_indices int[] default array[]::int[]
);

-- Table: players
create table players (
  id uuid default gen_random_uuid() primary key,
  room_code text references rooms(code) on delete cascade,
  nickname text not null,
  team text default 'SPECTATOR', -- 'A', 'B', 'SPECTATOR'
  is_captain boolean default false,
  stats_good_answers int default 0,
  created_at timestamptz default now()
);

-- Seed Data
insert into questions (id, theme, question_text, answers) values
(1, 'Ramadan', 'Qu''est-ce qu''on trouve OBLIGATOIREMENT sur la table du F''tour ?', '[{"text": "La Chorba / Hrira", "points": 35}, {"text": "Les Boureks", "points": 30}, {"text": "Les Dattes / Lben", "points": 15}, {"text": "Le Pain (Matlouh)", "points": 10}, {"text": "Zlabia / Kalbelouz", "points": 10}]'),
(2, 'Quotidien', 'Une excuse bidon pour le retard ?', '[{"text": "Bouchons / Circulation", "points": 40}, {"text": "Réveil pas sonné", "points": 25}, {"text": "Pas de transport", "points": 15}, {"text": "Je suis en route", "points": 15}, {"text": "J''étais malade", "points": 5}]'),
(3, 'Mariage', 'Vu ou entendu dans un mariage DZ ?', '[{"text": "Le Cortège / Klaxons", "points": 35}, {"text": "Les Youyous", "points": 25}, {"text": "Mariée change de robe", "points": 20}, {"text": "Le Couscous", "points": 10}, {"text": "La famille qui critique", "points": 10}]'),
(4, 'Sac à main', 'Objet dans le sac d''une femme ?', '[{"text": "Téléphone", "points": 30}, {"text": "Argent / Porte-monnaie", "points": 25}, {"text": "Maquillage", "points": 20}, {"text": "Clés", "points": 15}, {"text": "Mouchoirs", "points": 10}]'),
(5, 'École', 'Dans le cartable au primaire ?', '[{"text": "Trousse", "points": 25}, {"text": "Ardoise / Craie", "points": 25}, {"text": "Goûter", "points": 20}, {"text": "Cahiers", "points": 20}, {"text": "Règle", "points": 10}]'),
(6, 'Peur', 'Ça fait peur aux enfants ?', '[{"text": "Le noir", "points": 30}, {"text": "Insectes / Cafards", "points": 25}, {"text": "Fantômes / Ghoula", "points": 20}, {"text": "Dentiste / Piqûre", "points": 15}, {"text": "Chiens", "points": 10}]'),
(7, 'Smartphone', 'Usage du téléphone hors appel ?', '[{"text": "Réseaux Sociaux", "points": 45}, {"text": "Photos / Selfies", "points": 20}, {"text": "Messages / SMS", "points": 15}, {"text": "Heure / Réveil", "points": 10}, {"text": "Jeux", "points": 10}]'),
(8, 'Football', 'Légende équipe nationale DZ ?', '[{"text": "Riyad Mahrez", "points": 35}, {"text": "Rabah Madjer", "points": 25}, {"text": "Lakhdar Belloumi", "points": 15}, {"text": "Islam Slimani", "points": 15}, {"text": "Raïs M''Bolhi", "points": 10}]'),
(9, 'Plage', 'Indispensable à la plage ?', '[{"text": "Parasol", "points": 30}, {"text": "Serviette", "points": 25}, {"text": "Glacière / Bouffe", "points": 20}, {"text": "Crème solaire", "points": 15}, {"text": "Maillot", "points": 10}]'),
(10, 'Maman', 'Phrase de maman énervée ?', '[{"text": "Hmar / Hmara", "points": 30}, {"text": "Tais-toi !", "points": 25}, {"text": "Viens je te fais rien", "points": 20}, {"text": "Regarde le fils du voisin", "points": 15}, {"text": "Attends que ton père rentre", "points": 10}]');
