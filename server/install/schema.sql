-- Trivedi Metamodular - Quotation Portal
-- Import this file in phpMyAdmin (BigRock cPanel) into your empty database.
-- Default login after import:  username: admin   password: admin123   (change it from Settings)

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  username VARCHAR(60) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS settings (
  k VARCHAR(64) NOT NULL,
  v MEDIUMTEXT NULL,
  PRIMARY KEY (k)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS items (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(200) NOT NULL,
  image VARCHAR(255) NULL,
  description TEXT NULL,
  default_qty VARCHAR(60) NULL,
  category VARCHAR(80) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL,
  PRIMARY KEY (id),
  KEY idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS quotations (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  quote_no VARCHAR(60) NOT NULL,
  quote_date DATE NOT NULL,
  client_name VARCHAR(160) NOT NULL,
  client_phone VARCHAR(30) NULL,
  client_email VARCHAR(160) NULL,
  client_address VARCHAR(255) NULL,
  site_location VARCHAR(160) NULL,
  title VARCHAR(200) NULL,
  intro TEXT NULL,
  wood_json MEDIUMTEXT NULL,
  acc_heading VARCHAR(120) NULL,
  items_json MEDIUMTEXT NULL,
  amount_label VARCHAR(255) NULL,
  amount DECIMAL(14,2) NOT NULL DEFAULT 0,
  notes TEXT NULL,
  terms TEXT NULL,
  payment_terms TEXT NULL,
  closing TEXT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  share_token VARCHAR(40) NOT NULL,
  created_by INT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_quote_no (quote_no),
  UNIQUE KEY uq_token (share_token),
  KEY idx_client (client_name),
  KEY idx_date (quote_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Default admin (password: admin123)
INSERT INTO users (name, username, password_hash) VALUES
('Admin', 'admin', '$2y$10$cP7gNPiuQ5iymQdt3gXCQuOYcq.pUFd1zOZmBCfQ6sKtM2deOaM86');

-- Company + default quotation content (all editable from Settings)
INSERT INTO settings (k, v) VALUES
('company_name', 'TRIVEDI'),
('company_name2', 'METAMODULAR'),
('tagline', 'MODULAR SOLUTIONS • TIMELESS SPACES'),
('phones', '95417-46769 | 82210-08004'),
('locations', 'Kurukshetra • Karnal • Ambala'),
('logo', 'seed/logo.png'),
('header_image', 'seed/header-kitchen.jpg'),
('signature_label', 'For Trivedi Metamodular'),
('footer_text', 'Trivedi Metamodular · Modular Kitchen Quotation'),
('quote_prefix', 'TM/Q/26/'),
('next_number', '1'),
('number_padding', '3'),
('default_title', 'QUOTATION FOR MODULAR KITCHEN'),
('default_intro', 'We are pleased quote as per the drawings attached for your residence kitchen at, {location}.'),
('default_acc_heading', 'ACCESSORIES'),
('default_amount_label', 'AMOUNT FOR KITCHEN WITH OZONE HARDWARE\n& Imported Accessories'),
('default_wood_json', '{"show":true,"heading":"WOODEN WORK","left":{"title":"SHUTTERS","image":""},"right":{"title":"CABINATE","image":"seed/cabinet.jpg"},"rows":[{"left":"Colour Base & Top Shutter : as per your selection\\n\\nGerman Foil on CNC HDHMR Pannel (18-22mm)","right":"Both Side Pre-Lam\\nBase Carcasses - BOILO\\nTop Carcasses - HDHMR"},{"left":"Base & Top Box Colour - White","right":"Only Open Box Colour - Wooden"}]}'),
('default_notes', 'Electricity & Painter Work Supply by Owner\nAppliances, sink, tile & stone Supply by Owner\n**Production time starts from the day of final dimension received**\n**Order once confirmed cannot be cancelled.**'),
('default_terms', 'Above quote is on the basis of drawing attached with this quotation.\nAbove quote is inclusive of cost of same accessories & Hardware as per mentioned.\nAbove quote does not include any cost of civil works if required than will be done by your end.\nIn case of any damage due to water and termite, the damage part to be changed after paying the Labour charge only.\nWarranties for Hardware & Accessories keep same as per their company name norms.\nCheck all design and details before finalization. Any type of item ordered after finalization will be **charged extra**.\nGoods will not be refunded because these all goods are on order basis.'),
('default_payment_terms', '50 % Payment at the time of confirmation of order.\n50% Payment will have to be received before production of your Kitchen.'),
('default_closing', 'In case of any other clarification, please feel free to get in touch.\nLooking forward to a mutual beneficial relationship and assuring you of best services at all times.'),
('whatsapp_template', 'Namaste {client},\n\nThank you for choosing Trivedi Metamodular. Please find your quotation {quote_no} for {title} below:\n{link}\n\nAmount: Rs. {amount}/-\n\nFor any clarification feel free to call us at 95417-46769.');

-- Item master seeded from the sample quotation
INSERT INTO items (name, image, description, default_qty, category, sort_order) VALUES
('PVC Leg''s', 'seed/pvc-legs.jpg', 'Adjustable PVC legs for base cabinets', '40', 'Accessories', 1),
('Alumunium Finish Skirting', 'seed/aluminium-skirting.jpg', 'Aluminium finish plinth skirting', '4 Length', 'Accessories', 2),
('Innotech 4"', 'seed/innotech-4.jpg', 'Innotech drawer system 4 inch', '8 No''s', 'Hardware', 3),
('Innotech 8"', 'seed/innotech-8.jpg', 'Innotech drawer system 8 inch', '8 No''s', 'Hardware', 4),
('PVC Tray', 'seed/pvc-tray.jpg', 'Cutlery PVC tray', '2 No''s', 'Accessories', 5),
('Cabinatery Lighting', 'seed/cabinetry-lighting.jpg', 'LED profile lighting under wall cabinets', 'As per used', 'Accessories', 6),
('Dish Rack', 'seed/dish-rack.jpg', 'Stainless steel dish rack', '1 set', 'Accessories', 7),
('Bottle pull out', 'seed/bottle-pullout.jpg', 'Bottle pull out unit', '1 set', 'Accessories', 8),
('Pull Out waste - bin', 'seed/waste-bin-pullout.jpg', 'Pull out waste bin', '1 set', 'Accessories', 9),
('Hinges 0'' Crank', 'seed/hinges-0-crank.jpg', 'Soft close hinges 0 crank', 'As per used', 'Hardware', 10);
