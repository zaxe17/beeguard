-- BeeGuard backup (auto) of `beeguard_system`
-- Created 2026-09-29T13:32:33
-- Tables: 22

SET FOREIGN_KEY_CHECKS = 0
-- @@END@@

-- Table `admins`
DROP TABLE IF EXISTS `admins`
-- @@END@@
CREATE TABLE `admins` (
  `adminID` varchar(15) NOT NULL,
  `admin_name` varchar(40) NOT NULL,
  `address` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `contact_no` varchar(10) NOT NULL,
  `email` varchar(50) NOT NULL,
  `status` varchar(10) NOT NULL DEFAULT 'Active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`adminID`),
  UNIQUE KEY `uq_admins_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@END@@
INSERT INTO `admins` (`adminID`, `admin_name`, `address`, `password`, `contact_no`, `email`, `status`, `created_at`, `updated_at`, `deleted_at`) VALUES
('ADM-000001', 'BeeGuard Admin', 'Bureau of Animal Industry, Quezon City', '$2b$12$uXkaTZ2aBMSPFZsQOSFLw.qou7FZ5f7iAHUJ0CDGDbd0oQkA7n/D.', '9000000000', 'admin@beeguard.com', 'Active', '2026-09-28 10:57:54', '2026-09-29 12:20:21', NULL)
-- @@END@@

-- Table `alert_recipients`
DROP TABLE IF EXISTS `alert_recipients`
-- @@END@@
CREATE TABLE `alert_recipients` (
  `recipient_id` varchar(15) NOT NULL,
  `alert_id` varchar(15) NOT NULL,
  `beekeeper_id` varchar(15) NOT NULL,
  `distance_km` decimal(6,2) DEFAULT NULL,
  `risk_level` varchar(10) DEFAULT NULL,
  `notification_id` varchar(25) NOT NULL,
  `notified_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`recipient_id`),
  UNIQUE KEY `uq_alert_recipients_alert_beekeeper` (`alert_id`,`beekeeper_id`),
  KEY `idx_alert_recipients_beekeeper` (`beekeeper_id`,`notified_at`),
  KEY `fk_alert_recipients_notification` (`notification_id`),
  CONSTRAINT `fk_alert_recipients_alert` FOREIGN KEY (`alert_id`) REFERENCES `alerts` (`alert_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_alert_recipients_beekeeper` FOREIGN KEY (`beekeeper_id`) REFERENCES `beekeepers` (`beekeeperID`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_alert_recipients_notification` FOREIGN KEY (`notification_id`) REFERENCES `notifications` (`notification_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_alert_recipients_risk_level` CHECK (`risk_level` is null or `risk_level` in ('Low','Medium','High'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@END@@
INSERT INTO `alert_recipients` (`recipient_id`, `alert_id`, `beekeeper_id`, `distance_km`, `risk_level`, `notification_id`, `notified_at`, `created_at`) VALUES
('ARC-000001', 'ALT-000001', 'BKP-000001', 0.11, 'High', 'NT-2608052317499c6861', NULL, '2026-08-06 07:17:49'),
('ARC-000002', 'ALT-000002', 'BKP-000001', 2.03, 'Medium', 'NT-260805231815bd7846', NULL, '2026-08-06 07:18:15'),
('ARC-000003', 'ALT-000003', 'BKP-000001', 18.64, 'Low', 'NT-260805231828379c8a', NULL, '2026-08-06 07:18:28'),
('ARC-000004', 'ALT-000004', 'BKP-000001', 5.48, 'Low', 'NT-260806004124d9753e', NULL, '2026-08-06 08:41:24'),
('ARC-000005', 'ALT-000005', 'BKP-000001', 0.15, 'High', 'NT-260806004230ab7020', NULL, '2026-08-06 08:42:30'),
('ARC-000006', 'ALT-000005', 'BKP-000002', 0.15, 'High', 'NT-260806004230a4f62c', NULL, '2026-08-06 08:42:30'),
('ARC-000007', 'ALT-000006', 'BKP-000002', 0.51, 'High', 'NT-2609280439000a245d', NULL, '2026-09-28 12:39:00'),
('ARC-000008', 'ALT-000006', 'BKP-000001', 0.51, 'High', 'NT-260928043900c516e2', NULL, '2026-09-28 12:39:00')
-- @@END@@

-- Table `alerts`
DROP TABLE IF EXISTS `alerts`
-- @@END@@
CREATE TABLE `alerts` (
  `alert_id` varchar(15) NOT NULL,
  `adminID` varchar(15) DEFAULT NULL,
  `beekeeperID` varchar(15) DEFAULT NULL,
  `reported_by_beekeeper_id` varchar(15) DEFAULT NULL,
  `source` varchar(20) NOT NULL DEFAULT 'admin',
  `title` varchar(100) DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `pesticide_type` varchar(50) DEFAULT NULL,
  `application_method` varchar(30) DEFAULT NULL,
  `affected_area` varchar(100) DEFAULT NULL,
  `latitude` decimal(10,8) NOT NULL,
  `longitude` decimal(11,8) NOT NULL,
  `scheduled_date` datetime NOT NULL,
  `expiration_date` datetime DEFAULT NULL,
  `danger_radius_km` decimal(5,2) NOT NULL,
  `risk_level` varchar(10) NOT NULL,
  `approval_status` varchar(10) NOT NULL DEFAULT 'Approved',
  `reviewed_at` timestamp NULL DEFAULT NULL,
  `reviewed_by` varchar(15) DEFAULT NULL,
  `rejection_reason` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp(),
  PRIMARY KEY (`alert_id`),
  KEY `fk_alerts_admin` (`adminID`),
  KEY `fk_alerts_beekeeper` (`beekeeperID`),
  KEY `fk_alerts_reported_by_beekeeper` (`reported_by_beekeeper_id`),
  KEY `idx_alerts_approval` (`approval_status`,`scheduled_date`),
  CONSTRAINT `fk_alerts_admin` FOREIGN KEY (`adminID`) REFERENCES `admins` (`adminID`) ON UPDATE CASCADE,
  CONSTRAINT `fk_alerts_beekeeper` FOREIGN KEY (`beekeeperID`) REFERENCES `beekeepers` (`beekeeperID`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_alerts_reported_by_beekeeper` FOREIGN KEY (`reported_by_beekeeper_id`) REFERENCES `beekeepers` (`beekeeperID`) ON UPDATE CASCADE,
  CONSTRAINT `chk_alerts_risk_level` CHECK (`risk_level` in ('Low','Medium','High')),
  CONSTRAINT `chk_alerts_source` CHECK (`source` in ('admin','beekeeper')),
  CONSTRAINT `chk_alerts_source_actor` CHECK (`source` = 'admin' and `adminID` is not null or `source` = 'beekeeper' and `reported_by_beekeeper_id` is not null),
  CONSTRAINT `chk_alerts_application_method` CHECK (`application_method` is null or `application_method` in ('Aerial Spray','Ground Spray','Fogging','Dusting','Soil Application')),
  CONSTRAINT `chk_alerts_approval_status` CHECK (`approval_status` in ('Pending','Approved','Rejected'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@END@@
INSERT INTO `alerts` (`alert_id`, `adminID`, `beekeeperID`, `reported_by_beekeeper_id`, `source`, `title`, `description`, `pesticide_type`, `application_method`, `affected_area`, `latitude`, `longitude`, `scheduled_date`, `expiration_date`, `danger_radius_km`, `risk_level`, `approval_status`, `reviewed_at`, `reviewed_by`, `rejection_reason`, `created_at`, `updated_at`) VALUES
('ALT-000001', NULL, NULL, 'BKP-000001', 'beekeeper', 'Insecticide Application', NULL, 'Insecticide', NULL, NULL, 14.49108466, 121.01903885, '2026-08-05 23:17:00', NULL, 5.00, 'High', 'Approved', NULL, NULL, NULL, '2026-08-06 07:17:49', '2026-09-28 12:29:14'),
('ALT-000002', NULL, NULL, 'BKP-000001', 'beekeeper', 'Insecticide Application', NULL, 'Insecticide', NULL, NULL, 14.48626480, 121.03661945, '2026-08-05 23:18:00', NULL, 5.00, 'Medium', 'Approved', NULL, NULL, NULL, '2026-08-06 07:18:15', NULL),
('ALT-000003', NULL, NULL, 'BKP-000001', 'beekeeper', 'Insecticide Application', NULL, 'Insecticide', NULL, NULL, 14.66046083, 121.02065799, '2026-08-05 23:18:00', NULL, 5.00, 'Low', 'Approved', NULL, NULL, NULL, '2026-08-06 07:18:28', '2026-09-28 12:29:14'),
('ALT-000004', NULL, NULL, 'BKP-000001', 'beekeeper', 'Insecticide Application', NULL, 'Insecticide', NULL, NULL, 14.52511155, 121.05658634, '2026-08-06 00:41:00', NULL, 5.00, 'Low', 'Approved', NULL, NULL, NULL, '2026-08-06 08:41:24', '2026-09-28 12:29:14'),
('ALT-000005', NULL, NULL, 'BKP-000002', 'beekeeper', 'Insecticide Application', NULL, 'Insecticide', NULL, NULL, 14.49076611, 121.01937534, '2026-08-06 00:42:00', NULL, 5.00, 'High', 'Approved', NULL, NULL, NULL, '2026-08-06 08:42:30', '2026-09-28 12:29:14'),
('ALT-000006', NULL, NULL, 'BKP-000001', 'beekeeper', 'Fungicide Application', NULL, 'Fungicide', NULL, NULL, 14.48784373, 121.01662289, '2026-09-28 04:37:00', NULL, 3.00, 'High', 'Approved', '2026-09-28 12:39:00', 'ADM-000001', NULL, '2026-09-28 12:37:51', '2026-09-28 12:39:00')
-- @@END@@

-- Table `beekeepers`
DROP TABLE IF EXISTS `beekeepers`
-- @@END@@
CREATE TABLE `beekeepers` (
  `beekeeperID` varchar(15) NOT NULL,
  `name` varchar(40) NOT NULL,
  `citizenship` varchar(20) NOT NULL,
  `address` varchar(255) DEFAULT NULL,
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) NOT NULL,
  `username` varchar(30) NOT NULL,
  `password` varchar(255) NOT NULL,
  `contact_no` varchar(10) NOT NULL,
  `email` varchar(50) NOT NULL,
  `email_verified` tinyint(1) NOT NULL DEFAULT 0,
  `profile_photo` varchar(255) DEFAULT NULL,
  `farm_photo` varchar(255) DEFAULT NULL,
  `farm_name` varchar(20) DEFAULT NULL,
  `apiary_type` varchar(20) NOT NULL,
  `status` varchar(10) NOT NULL DEFAULT 'Active',
  `verification_document_type` varchar(60) DEFAULT NULL,
  `verification_document_url` varchar(255) DEFAULT NULL,
  `verification_status` varchar(15) NOT NULL DEFAULT 'Unverified',
  `verification_submitted_at` timestamp NULL DEFAULT NULL,
  `verification_reviewed_at` timestamp NULL DEFAULT NULL,
  `verification_reviewed_by` varchar(15) DEFAULT NULL,
  `verification_rejection_reason` varchar(255) DEFAULT NULL,
  `terms_accepted` tinyint(1) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`beekeeperID`),
  UNIQUE KEY `uq_beekeepers_email` (`email`),
  UNIQUE KEY `uq_beekeepers_username` (`username`),
  UNIQUE KEY `uq_beekeepers_contact_no` (`contact_no`),
  KEY `idx_beekeepers_verification` (`verification_status`,`verification_submitted_at`),
  CONSTRAINT `chk_beekeepers_apiary_type` CHECK (`apiary_type` in ('Commercial Farm','Backyard','Rooftop','Wild/Forest')),
  CONSTRAINT `chk_beekeepers_status` CHECK (`status` in ('Active','Inactive')),
  CONSTRAINT `chk_beekeepers_verification_status` CHECK (`verification_status` in ('Unverified','Pending','Verified','Rejected'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@END@@
INSERT INTO `beekeepers` (`beekeeperID`, `name`, `citizenship`, `address`, `latitude`, `longitude`, `username`, `password`, `contact_no`, `email`, `email_verified`, `profile_photo`, `farm_photo`, `farm_name`, `apiary_type`, `status`, `verification_document_type`, `verification_document_url`, `verification_status`, `verification_submitted_at`, `verification_reviewed_at`, `verification_reviewed_by`, `verification_rejection_reason`, `terms_accepted`, `created_at`, `updated_at`, `deleted_at`) VALUES
('BKP-000001', 'John Evans Lacuas Gutierrez', 'Filipino', 'Lot 1 Blk 5, De Leon St., Moonwalk, City of ParaÃ±aque, National Capital Region (NCR)', 14.49199550, 121.01876328, 'sucri', '$2b$12$TjgAGYesiX4Zs3sRPH7bxu2Z3CSFvWYiW5jXUz3lVkIQnD6jyAwF6', '9296630831', 'johnevansgutierrez9@gmail.com', 1, NULL, NULL, 'Jolly Bee Farm', 'Commercial Farm', 'Active', 'Valid Government ID', 'BKP-000001_3674ce8c0e0643c4b8140d3fa23df425.jpg', 'Verified', '2026-09-28 11:15:45', '2026-09-28 11:16:55', 'ADM-000001', NULL, 1, '2026-08-06 07:16:16', '2026-09-29 12:20:18', NULL),
('BKP-000002', 'Reiana Mari Mandeoya Faiganan', 'Filipino', 'Blk 55 Lot 17, Pinagsama, City of Taguig, National Capital Region (NCR)', 14.49196524, 121.01882451, 'xyriana', '$2b$12$UvvACxYJuQvmZnufucPCcO1kPZQNHuZB5QgWMwidpOfLOxW.t2hem', '9064363747', 'sucriana@gmail.com', 1, NULL, NULL, 'Happy Bee Farm', 'Commercial Farm', 'Inactive', NULL, NULL, 'Unverified', NULL, NULL, NULL, NULL, 1, '2026-08-06 08:39:42', '2026-09-29 12:20:18', NULL),
('BKP-000003', 'John Evans Lacuas Gutierrez', 'Filipino', 'Lot 1 Blk 5, De Leon St., Moonwalk, City of ParaÃ±aque, National Capital Region (NCR)', 14.49193512, 121.01861111, 'sylp', '$2b$12$evjDhq3pXN7lBeSS9kBy6OwvFifO/SksYLv4BhUWnGa0eqOlDiTDm', '9485348593', 'sylcrosylpha@gmail.com', 1, NULL, NULL, 'Sylpha BeeFarm', 'Commercial Farm', 'Active', NULL, NULL, 'Unverified', NULL, NULL, NULL, NULL, 1, '2026-09-29 12:58:36', '2026-09-29 13:00:05', NULL)
-- @@END@@

-- Table `chat_reports`
DROP TABLE IF EXISTS `chat_reports`
-- @@END@@
CREATE TABLE `chat_reports` (
  `chat_report_id` varchar(15) NOT NULL,
  `chat_id` int(11) NOT NULL,
  `reporter_role` varchar(10) NOT NULL,
  `reporter_id` varchar(15) NOT NULL,
  `category` varchar(50) NOT NULL,
  `details` varchar(255) DEFAULT NULL,
  `status` varchar(15) NOT NULL DEFAULT 'Pending',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `resolved_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`chat_report_id`),
  KEY `fk_chat_reports_chat` (`chat_id`),
  CONSTRAINT `fk_chat_reports_chat` FOREIGN KEY (`chat_id`) REFERENCES `chats` (`chat_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_chat_reports_role` CHECK (`reporter_role` in ('Citizen','Beekeeper')),
  CONSTRAINT `chk_chat_reports_status` CHECK (`status` in ('Pending','Reviewed','Dismissed'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@END@@

-- Table `chats`
DROP TABLE IF EXISTS `chats`
-- @@END@@
CREATE TABLE `chats` (
  `chat_id` int(11) NOT NULL AUTO_INCREMENT,
  `citizenID` varchar(15) DEFAULT NULL,
  `beekeeperID` varchar(15) DEFAULT NULL,
  `citizen_marked_unread` tinyint(1) NOT NULL DEFAULT 0,
  `beekeeper_marked_unread` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`chat_id`),
  KEY `fk_chats_citizen` (`citizenID`),
  KEY `fk_chats_beekeeper` (`beekeeperID`),
  CONSTRAINT `fk_chats_beekeeper` FOREIGN KEY (`beekeeperID`) REFERENCES `beekeepers` (`beekeeperID`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_chats_citizen` FOREIGN KEY (`citizenID`) REFERENCES `citizens` (`citizenID`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@END@@
INSERT INTO `chats` (`chat_id`, `citizenID`, `beekeeperID`, `citizen_marked_unread`, `beekeeper_marked_unread`, `created_at`) VALUES
(2, 'CTZ-000001', 'BKP-000001', 0, 0, '2026-09-27 10:24:57')
-- @@END@@

-- Table `citizens`
DROP TABLE IF EXISTS `citizens`
-- @@END@@
CREATE TABLE `citizens` (
  `citizenID` varchar(15) NOT NULL,
  `name` varchar(40) NOT NULL,
  `citizenship` varchar(20) NOT NULL,
  `address` varchar(255) DEFAULT NULL,
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) NOT NULL,
  `username` varchar(30) NOT NULL,
  `password` varchar(255) NOT NULL,
  `contact_no` varchar(10) NOT NULL,
  `email` varchar(50) NOT NULL,
  `email_verified` tinyint(1) NOT NULL DEFAULT 0,
  `profile_photo` varchar(255) DEFAULT NULL,
  `status` varchar(10) NOT NULL DEFAULT 'Active',
  `terms_accepted` tinyint(1) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`citizenID`),
  UNIQUE KEY `uq_citizens_email` (`email`),
  UNIQUE KEY `uq_citizens_username` (`username`),
  UNIQUE KEY `uq_citizens_contact_no` (`contact_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@END@@
INSERT INTO `citizens` (`citizenID`, `name`, `citizenship`, `address`, `latitude`, `longitude`, `username`, `password`, `contact_no`, `email`, `email_verified`, `profile_photo`, `status`, `terms_accepted`, `created_at`, `updated_at`, `deleted_at`) VALUES
('CTZ-000001', 'John Evans L. Gutierrez', 'Filipino', 'Lot 1 Blk 5, De Leon St., Moonwalk, City of ParaÃ±aque, National Capital Region (NCR)', 14.49190300, 121.01860000, 'sylvcus', '$2b$12$NsPLc8HDBRPRTlNyP3sOk.Hd694OoPcf8WcsoG5hwvZN4GnT95gQC', '9615391951', 'sylcrosylphy@gmail.com', 1, NULL, 'Active', 1, '2026-09-21 01:29:11', '2026-09-29 12:20:16', NULL)
-- @@END@@

-- Table `cv_scans`
DROP TABLE IF EXISTS `cv_scans`
-- @@END@@
CREATE TABLE `cv_scans` (
  `cvscan_id` varchar(15) NOT NULL,
  `citizenID` varchar(15) DEFAULT NULL,
  `image_url` varchar(255) NOT NULL,
  `identified_species` varchar(50) DEFAULT NULL,
  `confidence_score` decimal(5,2) DEFAULT NULL,
  `scanned_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`cvscan_id`),
  KEY `fk_cv_scans_citizen` (`citizenID`),
  CONSTRAINT `fk_cv_scans_citizen` FOREIGN KEY (`citizenID`) REFERENCES `citizens` (`citizenID`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@END@@
INSERT INTO `cv_scans` (`cvscan_id`, `citizenID`, `image_url`, `identified_species`, `confidence_score`, `scanned_at`) VALUES
('CVS-000001', NULL, '/uploads/cv-scans/d9336cbc3e3941d2b5c7db22c0af223d_57.jpg', NULL, NULL, '2026-09-22 10:46:32'),
('CVS-000002', NULL, '/uploads/cv-scans/37b05b8b62894a3284e538fe8000ee29_F62DB6A0-0DEB-468B-8440-C3202479D9F0_frame_00080.jpg', 'Apis Cerana', 100.00, '2026-09-22 10:47:26'),
('CVS-000003', NULL, '/uploads/cv-scans/552f8f01bd5e4fcd9b18a3f7f2a5af52_57.jpg', NULL, NULL, '2026-09-22 10:47:49'),
('CVS-000004', NULL, '/uploads/cv-scans/c02774248a4f48dcab645070f1d3d15b_Screenshot_2026-08-26_225112.png', NULL, NULL, '2026-09-22 10:52:19'),
('CVS-000005', NULL, '/uploads/cv-scans/659478443a7c43d5b1310740c3179404_received_1737121477643885.jpeg', 'Apis Cerana', 100.00, '2026-09-22 10:52:56'),
('CVS-000006', NULL, '/uploads/cv-scans/bf82782858b64999b523cd8b91dee30e_received_1737121477643885.jpeg', 'Apis Cerana', 100.00, '2026-09-22 11:04:39'),
('CVS-000007', NULL, '/uploads/cv-scans/87078de69e144a93abdb531efd7499f0_F62DB6A0-0DEB-468B-8440-C3202479D9F0_frame_00080.jpg', 'Apis Cerana', 100.00, '2026-09-22 11:04:59'),
('CVS-000008', NULL, '/uploads/cv-scans/93f4130e91034766865a446ead61315c_F62DB6A0-0DEB-468B-8440-C3202479D9F0_frame_00080.jpg', 'Apis Cerana', 89.10, '2026-09-22 11:08:15'),
('CVS-000009', NULL, '/uploads/cv-scans/12e63bb5cc2b4766ad71cf8c183f1c4a_F62DB6A0-0DEB-468B-8440-C3202479D9F0_frame_00080.jpg', 'Apis Cerana', 89.10, '2026-09-22 11:12:45'),
('CVS-000010', NULL, '/uploads/cv-scans/e6efb30647a34dd58e96d34dbb6e6995_57.jpg', NULL, NULL, '2026-09-22 11:13:25'),
('CVS-000011', NULL, '/uploads/cv-scans/55215c78a279434182224483099ba045_F62DB6A0-0DEB-468B-8440-C3202479D9F0_frame_00080.jpg', 'Apis Cerana', 89.10, '2026-09-22 11:23:40'),
('CVS-000012', NULL, '/uploads/cv-scans/78c7a2c749cf49278fa115feb4b70d88_IMG_20260609_085213.jpg', 'Apis Cerana', 59.50, '2026-09-22 11:23:50'),
('CVS-000013', NULL, '/uploads/cv-scans/9b9db57e9621444cbee82f1eb0638065_received_1737121477643885.jpeg', 'Apis Cerana', 53.75, '2026-09-22 11:25:21'),
('CVS-000014', NULL, '/uploads/cv-scans/d1966bb6557e46beb39c26798f6ef2a8_IMG_20260609_085213.jpg', 'Apis Cerana', 59.50, '2026-09-22 11:26:04'),
('CVS-000015', NULL, '/uploads/cv-scans/54c69e41bb9e4fad94e22d93e3b9e830_IMG_20260625_095949.jpg', 'Apis Cerana', 69.10, '2026-09-22 11:30:52'),
('CVS-000016', NULL, '/uploads/cv-scans/538d286444a248e29374efbcc6b1565d_52.jpg', NULL, NULL, '2026-09-22 11:32:11'),
('CVS-000017', NULL, '/uploads/cv-scans/94188b803d3f44818dc774da671cc2ab_19.jpg', NULL, NULL, '2026-09-22 11:33:16'),
('CVS-000018', NULL, '/uploads/cv-scans/c48526bdb36c493bbcc2fcfea954a2c7_19.jpg', NULL, NULL, '2026-09-22 18:11:02'),
('CVS-000019', NULL, '/uploads/cv-scans/38211fa556c540a09ad8716d1807c39b_IMG_20260625_095949.jpg', 'Apis Cerana', 69.10, '2026-09-22 18:11:26'),
('CVS-000020', 'CTZ-000001', '/uploads/cv-scans/46de6b37b84c43b2b85e66f9279ae0fc_57.jpg', NULL, NULL, '2026-09-22 18:15:20'),
('CVS-000021', 'CTZ-000001', '/uploads/cv-scans/fe98480b7f864b4baa4bd85ad75bd4be_F62DB6A0-0DEB-468B-8440-C3202479D9F0_frame_00080.jpg', 'Apis Cerana', 89.10, '2026-09-22 18:15:38'),
('CVS-000022', 'CTZ-000001', '/uploads/cv-scans/ef36c87abafe4c229f1a7d64b93d7411_1AA_Edited_Mellifera_frame_01313.png', 'Apis Cerana', 59.34, '2026-09-22 18:15:53'),
('CVS-000023', 'CTZ-000001', '/uploads/cv-scans/0045d286db5c44edb8d2ee0e6b819937_IMG_20260609_085213.jpg', 'Apis Cerana', 60.46, '2026-09-22 18:16:12'),
('CVS-000024', 'CTZ-000001', '/uploads/cv-scans/b2131389966044398197113f2f91326d_IMG_20260609_085213.jpg', 'Apis Cerana', 60.46, '2026-09-22 19:58:53'),
('CVS-000025', 'CTZ-000001', '/uploads/cv-scans/ee7ddd5891e64e3ba6fe9c8c3f3ff059_19.jpg', NULL, NULL, '2026-09-22 19:59:18'),
('CVS-000026', 'CTZ-000001', '/uploads/cv-scans/e5237ddc78e14555a64c146d142df254_19.jpg', NULL, NULL, '2026-09-22 20:00:35'),
('CVS-000027', 'CTZ-000001', '/uploads/cv-scans/1db8b73f718a4f469d0c0f5444d5a985_1VID_20260907_173151_374_rotated_frame_00396.jpg', NULL, NULL, '2026-09-22 20:01:59'),
('CVS-000028', 'CTZ-000001', '/uploads/cv-scans/7acccf24ba97492aba4d70019f854562_images_3.jpg', NULL, NULL, '2026-09-22 20:06:46'),
('CVS-000029', 'CTZ-000001', '/uploads/cv-scans/a2dce60f2c6f4ff2b25f0dd313b53408_images_4.jpg', 'Apis Cerana', 70.03, '2026-09-22 20:07:08'),
('CVS-000030', 'CTZ-000001', '/uploads/cv-scans/d5c45e2d376e417d9d410ed1069a2102_Apis-mellifera-yemenitica-the-local-bee.png', NULL, NULL, '2026-09-22 20:08:19'),
('CVS-000031', 'CTZ-000001', '/uploads/cv-scans/8219f45933d24232876066910f05af5f_F62DB6A0-0DEB-468B-8440-C3202479D9F0_frame_00080.jpg', 'Apis Cerana', 89.10, '2026-09-22 21:03:06'),
('CVS-000032', 'CTZ-000001', '/uploads/cv-scans/2d77282062e94363bd76cdc6be5b3713_F62DB6A0-0DEB-468B-8440-C3202479D9F0_frame_00080.jpg', 'Apis Cerana', 89.10, '2026-09-22 21:03:12'),
('CVS-000033', 'CTZ-000001', '/uploads/cv-scans/d2da595626594c949e07964196e9989d_F62DB6A0-0DEB-468B-8440-C3202479D9F0_frame_00080.jpg', 'Apis Cerana', 89.10, '2026-09-22 21:13:19'),
('CVS-000034', 'CTZ-000001', '/uploads/cv-scans/ba5d9dcb8a444e638de6f32161051dca_F62DB6A0-0DEB-468B-8440-C3202479D9F0_frame_00080.jpg', 'Apis Cerana', 89.10, '2026-09-22 21:17:00'),
('CVS-000035', 'CTZ-000001', '/uploads/cv-scans/2300a22b77f34c298fafa848cc173e05_F62DB6A0-0DEB-468B-8440-C3202479D9F0_frame_00080.jpg', 'Apis Cerana', 89.10, '2026-09-22 21:18:45'),
('CVS-000036', 'CTZ-000001', '/uploads/cv-scans/f4887ce61c7e46819948250ae5d426d0_57.jpg', NULL, NULL, '2026-09-23 01:55:46'),
('CVS-000037', 'CTZ-000001', '/uploads/cv-scans/407a9e3401784f429b0e2134b0de0d61_images_4.jpg', 'Apis Cerana', 70.03, '2026-09-23 01:56:09'),
('CVS-000038', 'CTZ-000001', '/uploads/cv-scans/0110ce8ac7d34d5fb165deb4c65e9026_images_4.jpg', 'Apis Cerana', 70.03, '2026-09-23 01:56:21'),
('CVS-000039', 'CTZ-000001', '/uploads/cv-scans/d8aa86661b3b403888ee84a2c15da4ef_images_4.jpg', 'Apis Cerana', 70.03, '2026-09-24 11:08:06'),
('CVS-000040', 'CTZ-000001', '/uploads/cv-scans/ecb8846efe274ca98689009f5a00726f_19.jpg', NULL, NULL, '2026-09-24 11:08:52'),
('CVS-000041', 'CTZ-000001', '/uploads/cv-scans/405389f1999941b1b62df12f36634aab_images_4.jpg', 'Apis Cerana', 70.03, '2026-09-24 11:09:19'),
('CVS-000042', 'CTZ-000001', '/uploads/cv-scans/d6dad837bb8d4d449c3cbc74002d1db2_received_1737121477643885.jpeg', 'Apis Cerana', 52.68, '2026-09-24 11:10:33'),
('CVS-000043', 'CTZ-000001', '/uploads/cv-scans/52039cf8ca694ebdb9514cf44b50cde2_Apis-mellifera-yemenitica-the-local-bee.png', 'Apis mellifera', 47.38, '2026-09-24 11:51:38'),
('CVS-000044', 'CTZ-000001', '/uploads/cv-scans/acecf86efeb14ff5ad10d0149c183fc9_19.jpg', 'Apis mellifera', 57.19, '2026-09-24 11:52:07'),
('CVS-000045', 'CTZ-000001', '/uploads/cv-scans/128700f81afa4c5dbc9618570f53cda8_1VID_20260907_173151_374_rotated_frame_00396.jpg', 'Tetragonula biroi', 70.65, '2026-09-24 11:52:29'),
('CVS-000046', 'CTZ-000001', '/uploads/cv-scans/ebfd0b5655594fad86b4462ff28cf4e9_F62DB6A0-0DEB-468B-8440-C3202479D9F0_frame_00080.jpg', 'Apis cerana', 68.53, '2026-09-24 11:54:30'),
('CVS-000047', 'CTZ-000001', '/uploads/cv-scans/d0ec3a1dbefa479681ac2e7940f8117e_52.jpg', 'Apis mellifera', 61.95, '2026-09-24 11:54:38'),
('CVS-000048', 'CTZ-000001', '/uploads/cv-scans/56c6d0d85f6f41b68c89d5813cdec719_52.jpg', 'Apis mellifera', 61.95, '2026-09-24 11:58:30'),
('CVS-000049', 'CTZ-000001', '/uploads/cv-scans/11a2ff5919324c1492a506a22846e507_Screenshot_2026-08-26_225112.png', NULL, NULL, '2026-09-24 12:02:14'),
('CVS-000050', 'CTZ-000001', '/uploads/cv-scans/a915d2742da7486ab4ffb1d8e9174db5_received_1737121477643885.jpeg', 'Tetragonula biroi', 42.30, '2026-09-24 12:02:24'),
('CVS-000051', 'CTZ-000001', '/uploads/cv-scans/7a2cac28d3d64bf3b6f32189414fac16_Apis-mellifera-yemenitica-the-local-bee.png', 'Apis mellifera', 47.38, '2026-09-24 21:50:45'),
('CVS-000052', 'CTZ-000001', '/uploads/cv-scans/b0dcc90063fd4b328d2d954a2fc9b797_Apis-mellifera-yemenitica-the-local-bee.png', 'Apis mellifera', 47.38, '2026-09-25 01:26:58'),
('CVS-000053', NULL, '/uploads/cv-scans/30b1027693a34ee8bdcb012ccc4d9fd4_Apis-mellifera-yemenitica-the-local-bee.png', 'Apis mellifera', 47.38, '2026-09-26 10:16:49'),
('CVS-000054', NULL, '/uploads/cv-scans/c04cd55bb5a54612932407008f72f0ab_Apis-mellifera-yemenitica-the-local-bee.png', 'Apis mellifera', 47.38, '2026-09-26 10:17:28'),
('CVS-000055', NULL, '/uploads/cv-scans/e38c9847347248de853e701edcd799de_19.jpg', 'Apis mellifera', 57.19, '2026-09-26 10:18:44'),
('CVS-000056', NULL, '/uploads/cv-scans/01391a2de14c4d5eaffacb1f65fa8ad0_19.jpg', 'Apis Mellifera', 62.52, '2026-09-26 10:19:27'),
('CVS-000057', NULL, '/uploads/cv-scans/3a2aec6dd4f948e693fb563e15896b50_19.jpg', 'Apis Mellifera', 62.52, '2026-09-26 10:19:58'),
('CVS-000058', NULL, '/uploads/cv-scans/78095aae24d5429f8117825215111d25_Apis-mellifera-yemenitica-the-local-bee.png', 'Apis Mellifera', 55.43, '2026-09-26 10:20:53'),
('CVS-000059', NULL, '/uploads/cv-scans/cf8d65222c8d4c48b910b8a161932ee7_1VID_20260907_173151_374_rotated_frame_00396.jpg', 'Tetragonula biroi', 79.03, '2026-09-26 10:23:24'),
('CVS-000060', NULL, '/uploads/cv-scans/c576347ec5a84264b173469670711906_Screenshot_2026-08-26_225112.png', NULL, NULL, '2026-09-26 10:23:38'),
('CVS-000061', NULL, '/uploads/cv-scans/70faf080b5134319a443eecd11495a7a_57.jpg', 'Apis Mellifera', 72.92, '2026-09-26 10:23:46'),
('CVS-000062', NULL, '/uploads/cv-scans/e70262e5754f4ee49c8e7e1a7bc46a3c_57.jpg', 'Apis Mellifera', 72.92, '2026-09-26 10:24:21'),
('CVS-000063', NULL, '/uploads/cv-scans/b702982e83974cf5b1f6d8d93d8dd88c_F62DB6A0-0DEB-468B-8440-C3202479D9F0_frame_00080.jpg', 'Apis Cerana', 77.10, '2026-09-26 10:32:42'),
('CVS-000064', NULL, '/uploads/cv-scans/94c9d9517e9c4d08902e2737c0dbb104_received_1737121477643885.jpeg', 'Tetragonula biroi', 48.41, '2026-09-26 10:34:44'),
('CVS-000065', NULL, '/uploads/cv-scans/50ac4c7406db442697940d11508dc824_1VID_20260907_173151_374_rotated_frame_00396.jpg', 'Tetragonula biroi', 79.03, '2026-09-26 10:34:55'),
('CVS-000066', 'CTZ-000001', '/uploads/cv-scans/2d1e9ec01d804b7cb59fc51166247b0d_19.jpg', 'Apis Mellifera', 62.52, '2026-09-27 14:00:14'),
('CVS-000067', 'CTZ-000001', '/uploads/cv-scans/a9622b69bdc14e07b57d61026800fc02_Apis-mellifera-yemenitica-the-local-bee.png', 'Apis Mellifera', 55.43, '2026-09-28 07:46:15'),
('CVS-000068', 'CTZ-000001', '/uploads/cv-scans/7bc0a27dc3a2434ea04ff85546bcff42_Apis-mellifera-yemenitica-the-local-bee.png', 'Apis Mellifera', 55.43, '2026-09-28 08:12:54'),
('CVS-000069', 'CTZ-000001', '/uploads/cv-scans/81792545ccc6430585074cf2b52b6e0f_F62DB6A0-0DEB-468B-8440-C3202479D9F0_frame_00080.jpg', 'Apis Cerana', 77.10, '2026-09-28 08:50:41'),
('CVS-000070', 'CTZ-000001', '/uploads/cv-scans/a302cbc201b94a06bf6e080e00ea65f8_F62DB6A0-0DEB-468B-8440-C3202479D9F0_frame_00080.jpg', 'Apis Cerana', 77.10, '2026-09-28 09:00:18'),
('CVS-000071', 'CTZ-000001', '/uploads/cv-scans/26187dfd1f094046a5000a772da555cf_received_1737121477643885.jpeg', 'Tetragonula biroi', 48.41, '2026-09-28 09:03:02'),
('CVS-000072', 'CTZ-000001', '/uploads/cv-scans/0b04c4ab5bec429690ea6de1fbf78bc3_received_1737121477643885.jpeg', 'Tetragonula biroi', 48.41, '2026-09-28 09:19:42'),
('CVS-000073', 'CTZ-000001', '/uploads/cv-scans/6f53dd1d5bd74e7cac3a4bfe7fd0bc46_IMG_20260625_095949.jpg', 'Apis Mellifera', 54.69, '2026-09-28 19:14:59'),
('CVS-000074', 'CTZ-000001', '/uploads/cv-scans/ae3d35f22f3e449fbd9bbff48369b095_Apis-mellifera-yemenitica-the-local-bee.png', 'Apis Mellifera', 55.43, '2026-09-28 23:25:49'),
('CVS-000075', 'CTZ-000001', '/uploads/cv-scans/e7add8ac5aa14af581a8cf1940b0075d_Apis-mellifera-yemenitica-the-local-bee.png', 'Apis Mellifera', 55.43, '2026-09-28 23:26:36'),
('CVS-000076', 'CTZ-000001', '/uploads/cv-scans/7583faaa1d0043638fc1e9caee535f62_Apis-mellifera-yemenitica-the-local-bee.png', 'Apis Mellifera', 55.43, '2026-09-29 12:29:48'),
('CVS-000077', 'CTZ-000001', '/uploads/cv-scans/4ca425930eee4c0c90bc3ac76bd517fa_capture-1790656315260.jpg', 'Apis Cerana', 54.27, '2026-09-29 12:31:58'),
('CVS-000078', 'CTZ-000001', '/uploads/cv-scans/e001cb8e0f6c4ae395b8f3dc07544037_capture-1790656315260.jpg', 'Apis Cerana', 54.27, '2026-09-29 12:32:45'),
('CVS-000079', 'CTZ-000001', '/uploads/cv-scans/a62eee473971429cadfbf7de858c1e17_Apis-mellifera-yemenitica-the-local-bee.png', 'Apis Mellifera', 55.43, '2026-09-29 12:37:35'),
('CVS-000080', NULL, '/uploads/cv-scans/ae947b1b2c5245829d5f9b0ca4fae285_capture.jpg', NULL, NULL, '2026-09-29 12:41:19'),
('CVS-000081', 'CTZ-000001', '/uploads/cv-scans/b240d6cf54c44f72a538ac4ea0e12e59_capture-1790657138578.jpg', 'Apis Cerana', 69.39, '2026-09-29 12:45:40'),
('CVS-000082', 'CTZ-000001', '/uploads/cv-scans/90313bab7c864238886c0639d9aab2e8_capture-1790657240764.jpg', NULL, NULL, '2026-09-29 12:47:22'),
('CVS-000083', 'CTZ-000001', '/uploads/cv-scans/47b4a085b3984d0e8afdf0cf91132106_capture-1790657249916.jpg', NULL, NULL, '2026-09-29 12:47:30'),
('CVS-000084', 'CTZ-000001', '/uploads/cv-scans/31a27c226fb34aefb046cd9c9f285604_capture-1790657264405.jpg', NULL, NULL, '2026-09-29 12:47:46'),
('CVS-000085', NULL, '/uploads/cv-scans/39ef5f2c927d4fbeb89194818454b1b0_capture.jpg', NULL, NULL, '2026-09-29 12:49:16'),
('CVS-000086', NULL, '/uploads/cv-scans/33865257147a454a925c64a5c78cb222_capture.jpg', NULL, NULL, '2026-09-29 12:49:22'),
('CVS-000087', NULL, '/uploads/cv-scans/dd8e7fe546644ee59d9d9a2e87873712_images_4.jpg', 'Apis Mellifera', 50.95, '2026-09-29 12:50:07'),
('CVS-000088', NULL, '/uploads/cv-scans/6f1bd7dce58d4d41a541e6ee55dda829_images_4.jpg', 'Apis Mellifera', 50.95, '2026-09-29 12:50:13'),
('CVS-000089', NULL, '/uploads/cv-scans/80f2f35204e0464a8e9b64929b5f3869_capture.jpg', NULL, NULL, '2026-09-29 12:50:53'),
('CVS-000090', NULL, '/uploads/cv-scans/48f8b0aff7b44974a93549a2e8e2b7a0_capture.jpg', NULL, NULL, '2026-09-29 12:52:40'),
('CVS-000091', NULL, '/uploads/cv-scans/4ed95ea197b94a2e8276cc4f0f842c27_IMG_20260625_095949.jpg', 'Apis Mellifera', 54.69, '2026-09-29 12:52:50'),
('CVS-000092', NULL, '/uploads/cv-scans/bf5dce42f9884a45b2d8ee50dbe1afa8_IMG_20260625_095949.jpg', 'Apis Mellifera', 54.69, '2026-09-29 12:53:05'),
('CVS-000093', 'CTZ-000001', '/uploads/cv-scans/d3ad2ca65e054c4799e00f3c0e08d97c_capture-1790658138171.jpg', NULL, NULL, '2026-09-29 13:02:46'),
('CVS-000094', 'CTZ-000001', '/uploads/cv-scans/47d26a46410545b9bf1d32a369d98915_capture-1790658208352.jpg', 'Apis Cerana', 52.57, '2026-09-29 13:03:29'),
('CVS-000095', 'CTZ-000001', '/uploads/cv-scans/ee098328362e4ae38c5c26df16cb6df7_capture-1790658208352.jpg', 'Apis Cerana', 52.57, '2026-09-29 13:03:34'),
('CVS-000096', 'CTZ-000001', '/uploads/cv-scans/a8814a78fab8485c83974bad8ed56fc5_capture-1790658208352.jpg', 'Apis Cerana', 52.57, '2026-09-29 13:03:44'),
('CVS-000097', 'CTZ-000001', '/uploads/cv-scans/63a8814c4a6e447591896fbc2eb371e0_images_4.jpg', 'Apis Mellifera', 50.95, '2026-09-29 13:08:09'),
('CVS-000098', 'CTZ-000001', '/uploads/cv-scans/9af67821545f43589d4633a0e7d33be4_images_4.jpg', 'Apis Mellifera', 50.95, '2026-09-29 13:08:52')
-- @@END@@

-- Table `follows`
DROP TABLE IF EXISTS `follows`
-- @@END@@
CREATE TABLE `follows` (
  `citizenID` varchar(15) NOT NULL,
  `beekeeperID` varchar(15) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`citizenID`,`beekeeperID`),
  KEY `fk_follows_beekeeper` (`beekeeperID`),
  CONSTRAINT `fk_follows_beekeeper` FOREIGN KEY (`beekeeperID`) REFERENCES `beekeepers` (`beekeeperID`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_follows_citizen` FOREIGN KEY (`citizenID`) REFERENCES `citizens` (`citizenID`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@END@@
INSERT INTO `follows` (`citizenID`, `beekeeperID`, `created_at`) VALUES
('CTZ-000001', 'BKP-000001', '2026-09-27 13:59:32')
-- @@END@@

-- Table `hives`
DROP TABLE IF EXISTS `hives`
-- @@END@@
CREATE TABLE `hives` (
  `hive_id` varchar(15) NOT NULL,
  `beekeeper_id` varchar(15) NOT NULL,
  `hive_name` varchar(15) NOT NULL,
  `bee_species` varchar(50) NOT NULL,
  `date_established` date NOT NULL,
  `queen_installed_date` date DEFAULT NULL,
  `historical_yield_kg` decimal(10,2) DEFAULT NULL,
  `historical_yield_year` int(11) DEFAULT NULL,
  `health_status` varchar(20) NOT NULL,
  `hive_state` varchar(20) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp(),
  PRIMARY KEY (`hive_id`),
  KEY `idx_hives_beekeeper` (`beekeeper_id`),
  CONSTRAINT `fk_hives_beekeeper` FOREIGN KEY (`beekeeper_id`) REFERENCES `beekeepers` (`beekeeperID`) ON UPDATE CASCADE,
  CONSTRAINT `chk_hives_health_status` CHECK (`health_status` in ('Healthy','Needs Attention','Weak','Diseased'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@END@@
INSERT INTO `hives` (`hive_id`, `beekeeper_id`, `hive_name`, `bee_species`, `date_established`, `queen_installed_date`, `historical_yield_kg`, `historical_yield_year`, `health_status`, `hive_state`, `created_at`, `updated_at`) VALUES
('HV-000001', 'BKP-000001', 'Kiwot', 'Tetragonula Biroi', '2026-08-01', '2026-08-01', 100.00, 2026, 'Healthy', 'Active', '2026-08-06 07:37:51', NULL),
('HV-000002', 'BKP-000001', 'Laywan', 'Apis Cerana', '2026-07-01', '2026-08-07', 100.00, 2026, 'Weak', 'Active', '2026-08-06 07:38:30', '2026-08-07 13:28:15'),
('HV-000003', 'BKP-000001', 'Pukyutan', 'Apis Mellifera', '2026-06-01', '2026-08-07', 100.00, 2026, 'Weak', 'Active', '2026-08-06 07:39:20', '2026-08-07 13:58:17'),
('HV-000004', 'BKP-000001', 'Uyukan', 'Apis Dorsata', '2026-05-01', '2026-08-07', 100.00, 2026, 'Healthy', 'Active', '2026-08-06 07:40:38', '2026-08-07 13:22:27'),
('HV-000005', 'BKP-000001', 'Sakura', 'Kiwot', '2026-08-01', '2026-09-03', 100.00, 2026, 'Healthy', 'Active', '2026-09-08 18:49:18', '2026-09-08 18:52:15'),
('HV-000006', 'BKP-000001', 'Naruto', 'Laywan', '2026-07-01', '2026-09-09', 100.00, 2026, 'Weak', 'Active', '2026-09-09 08:19:16', '2026-09-09 08:50:41')
-- @@END@@

-- Table `hives_maintenance`
DROP TABLE IF EXISTS `hives_maintenance`
-- @@END@@
CREATE TABLE `hives_maintenance` (
  `maintenance_id` varchar(15) NOT NULL,
  `hive_id` varchar(15) NOT NULL,
  `activity_type` varchar(30) NOT NULL,
  `remarks` text DEFAULT NULL,
  `activity_date` date NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`maintenance_id`),
  KEY `fk_hives_maintenance_hive` (`hive_id`),
  CONSTRAINT `fk_hives_maintenance_hive` FOREIGN KEY (`hive_id`) REFERENCES `hives` (`hive_id`) ON UPDATE CASCADE,
  CONSTRAINT `chk_hives_maintenance_activity_type` CHECK (`activity_type` in ('Feeding','Mite Treatment','Inspection'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@END@@
INSERT INTO `hives_maintenance` (`maintenance_id`, `hive_id`, `activity_type`, `remarks`, `activity_date`, `created_at`) VALUES
('MT-260806001048', 'HV-000003', 'Inspection', 'Physical Inspection: Presence of Queen Cells, Emaciated Queen', '2026-08-06', '2026-08-06 08:10:48'),
('MT-260806001837', 'HV-000002', 'Inspection', 'Physical Inspection: Presence of Queen Cells', '2026-08-06', '2026-08-06 08:18:37'),
('MT-260807051139', 'HV-000003', 'Inspection', 'Physical Inspection: Presence of Queen Cells, Emaciated Queen', '2026-08-07', '2026-08-07 13:11:39'),
('MT-260807052049', 'HV-000003', 'Inspection', 'Physical Inspection: Presence of Queen Cells, Emaciated Queen', '2026-08-07', '2026-08-07 13:20:49'),
('MT-260807052305', 'HV-000003', 'Inspection', 'Physical Inspection: Presence of Queen Cells, Emaciated Queen', '2026-08-07', '2026-08-07 13:23:05'),
('MT-260807052803', 'HV-000003', 'Inspection', 'Physical Inspection: Presence of Queen Cells', '2026-08-07', '2026-08-07 13:28:03'),
('MT-260807052815', 'HV-000002', 'Inspection', 'Physical Inspection: Presence of Queen Cells, Emaciated Queen', '2026-08-07', '2026-08-07 13:28:15'),
('MT-260807052839', 'HV-000003', 'Inspection', 'Physical Inspection: Presence of Queen Cells', '2026-08-07', '2026-08-07 13:28:39'),
('MT-260807055601', 'HV-000003', 'Inspection', 'Physical Inspection: Presence of Queen Cells', '2026-08-07', '2026-08-07 13:56:01'),
('MT-260807055623', 'HV-000003', 'Inspection', 'Physical Inspection: Normal / Healthy', '2026-08-07', '2026-08-07 13:56:23'),
('MT-260807055628', 'HV-000003', 'Inspection', 'Physical Inspection: Presence of Queen Cells', '2026-08-07', '2026-08-07 13:56:28'),
('MT-260807055817', 'HV-000003', 'Inspection', 'Physical Inspection: Emaciated Queen', '2026-08-07', '2026-08-07 13:58:17'),
('MT-260908104944', 'HV-000005', 'Inspection', 'Harvest Inspection: Presence of Queen Cells', '2026-09-01', '2026-09-08 18:49:44'),
('MT-260908105006', 'HV-000005', 'Inspection', 'Physical Inspection: Presence of Queen Cells', '2026-09-01', '2026-09-08 18:50:06'),
('MT-260908105159', 'HV-000005', 'Inspection', 'Physical Inspection: Presence of Queen Cells, Reduction of Open Brood', '2026-09-02', '2026-09-08 18:51:59'),
('MT-260908105215', 'HV-000005', 'Inspection', 'Physical Inspection: Normal / Healthy', '2026-09-03', '2026-09-08 18:52:15'),
('MT-260909001928', 'HV-000006', 'Inspection', 'Physical Inspection: Presence of Queen Cells, Reduction of Open Brood, Emaciated Queen', '2026-09-01', '2026-09-09 08:19:28'),
('MT-260909001947', 'HV-000006', 'Inspection', 'Physical Inspection: Normal / Healthy', '2026-09-09', '2026-09-09 08:19:47'),
('MT-260909002734', 'HV-000006', 'Inspection', 'Physical Inspection: Presence of Queen Cells, Reduction of Open Brood, Emaciated Queen', '2026-09-09', '2026-09-09 08:27:34'),
('MT-260909002740', 'HV-000006', 'Inspection', 'Physical Inspection: Normal / Healthy', '2026-09-09', '2026-09-09 08:27:40'),
('MT-260909003745', 'HV-000006', 'Inspection', 'Harvest Inspection: Normal / Healthy', '2026-09-09', '2026-09-09 08:37:45'),
('MT-260909003839', 'HV-000006', 'Inspection', 'Harvest Inspection: Normal / Healthy', '2026-09-09', '2026-09-09 08:38:39'),
('MT-260909004118', 'HV-000006', 'Inspection', 'Physical Inspection: Normal / Healthy', '2026-09-09', '2026-09-09 08:41:18'),
('MT-260909004129', 'HV-000006', 'Inspection', 'Physical Inspection: Presence of Queen Cells, Emaciated Queen, Reduction of Open Brood', '2026-09-09', '2026-09-09 08:41:29'),
('MT-260909004140', 'HV-000006', 'Inspection', 'Physical Inspection: Normal / Healthy', '2026-09-09', '2026-09-09 08:41:40'),
('MT-260909004200', 'HV-000006', 'Inspection', 'Harvest Inspection: Presence of Queen Cells', '2026-09-01', '2026-09-09 08:42:00'),
('MT-260909004206', 'HV-000006', 'Inspection', 'Physical Inspection: Normal / Healthy', '2026-09-09', '2026-09-09 08:42:06'),
('MT-260909004238', 'HV-000006', 'Inspection', 'Harvest Inspection: Normal / Healthy', '2026-09-01', '2026-09-09 08:42:38'),
('MT-260909004252', 'HV-000006', 'Inspection', 'Harvest Inspection: Normal / Healthy', '2026-09-09', '2026-09-09 08:42:52'),
('MT-260909004816', 'HV-000006', 'Inspection', 'Harvest Inspection: Normal / Healthy', '2026-09-09', '2026-09-09 08:48:16'),
('MT-260909005041', 'HV-000006', 'Inspection', 'Harvest Inspection: Normal / Healthy', '2026-09-09', '2026-09-09 08:50:41')
-- @@END@@

-- Table `messages`
DROP TABLE IF EXISTS `messages`
-- @@END@@
CREATE TABLE `messages` (
  `message_id` int(11) NOT NULL AUTO_INCREMENT,
  `chat_id` int(11) NOT NULL,
  `sender_role` varchar(10) NOT NULL,
  `message_type` varchar(10) NOT NULL DEFAULT 'text',
  `message_content` text NOT NULL,
  `image_url` varchar(255) DEFAULT NULL,
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) DEFAULT NULL,
  `live_until` timestamp NULL DEFAULT NULL,
  `location_updated_at` timestamp NULL DEFAULT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT 0,
  `sent_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`message_id`),
  KEY `fk_messages_chat` (`chat_id`),
  CONSTRAINT `fk_messages_chat` FOREIGN KEY (`chat_id`) REFERENCES `chats` (`chat_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_messages_sender_role` CHECK (`sender_role` in ('Beekeeper','Citizen')),
  CONSTRAINT `chk_messages_location_coords` CHECK (`message_type` <> 'location' or `latitude` is not null and `longitude` is not null),
  CONSTRAINT `chk_messages_type` CHECK (`message_type` in ('text','location','image')),
  CONSTRAINT `chk_messages_image_url` CHECK (`message_type` <> 'image' or `image_url` is not null)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@END@@
INSERT INTO `messages` (`message_id`, `chat_id`, `sender_role`, `message_type`, `message_content`, `image_url`, `latitude`, `longitude`, `live_until`, `location_updated_at`, `is_read`, `sent_at`) VALUES
(7, 2, 'Citizen', 'location', 'Shared a live location', NULL, 14.49193109, 121.01859678, '2026-09-27 14:42:24', '2026-09-27 13:43:53', 1, '2026-09-27 13:42:24'),
(8, 2, 'Beekeeper', 'image', 'Sent a photo', 'b6c8e8ef051f461db0cb3534d4e201d2.jpg', NULL, NULL, NULL, NULL, 1, '2026-09-27 13:55:19'),
(9, 2, 'Beekeeper', 'text', 'yow', NULL, NULL, NULL, NULL, NULL, 0, '2026-09-29 13:10:15'),
(10, 2, 'Beekeeper', 'text', 'up', NULL, NULL, NULL, NULL, NULL, 0, '2026-09-29 13:10:17'),
(11, 2, 'Beekeeper', 'text', 'down', NULL, NULL, NULL, NULL, NULL, 0, '2026-09-29 13:10:18'),
(12, 2, 'Beekeeper', 'text', 'left and right', NULL, NULL, NULL, NULL, NULL, 0, '2026-09-29 13:10:21')
-- @@END@@

-- Table `notifications`
DROP TABLE IF EXISTS `notifications`
-- @@END@@
CREATE TABLE `notifications` (
  `notification_id` varchar(25) NOT NULL,
  `beekeeperID` varchar(15) DEFAULT NULL,
  `citizenID` varchar(15) DEFAULT NULL,
  `adminID` varchar(15) DEFAULT NULL,
  `alert_id` varchar(15) DEFAULT NULL,
  `reportID` varchar(15) DEFAULT NULL,
  `title` varchar(30) NOT NULL,
  `message` text NOT NULL,
  `notification_type` varchar(20) NOT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`notification_id`),
  KEY `fk_notifications_beekeeper` (`beekeeperID`),
  KEY `fk_notifications_alert` (`alert_id`),
  KEY `fk_notifications_report` (`reportID`),
  KEY `idx_notifications_citizen` (`citizenID`,`is_read`),
  KEY `idx_notifications_admin` (`adminID`,`is_read`),
  CONSTRAINT `fk_notifications_admin` FOREIGN KEY (`adminID`) REFERENCES `admins` (`adminID`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_notifications_alert` FOREIGN KEY (`alert_id`) REFERENCES `alerts` (`alert_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_notifications_beekeeper` FOREIGN KEY (`beekeeperID`) REFERENCES `beekeepers` (`beekeeperID`) ON UPDATE CASCADE,
  CONSTRAINT `fk_notifications_citizen` FOREIGN KEY (`citizenID`) REFERENCES `citizens` (`citizenID`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_notifications_report` FOREIGN KEY (`reportID`) REFERENCES `reports` (`reportID`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@END@@
INSERT INTO `notifications` (`notification_id`, `beekeeperID`, `citizenID`, `adminID`, `alert_id`, `reportID`, `title`, `message`, `notification_type`, `is_read`, `created_at`) VALUES
('NT-2608052317499c6861', 'BKP-000001', NULL, NULL, 'ALT-000001', NULL, 'Alert Published', 'Your pesticide alert \"Insecticide Application\" has been published and sent to 0 beekeeper(s). None of them are inside the 5.0 km danger radius. Your own apiary is approx. 0.11 km from the site (risk level: High).', 'pesticide_alert', 0, '2026-08-06 07:17:49'),
('NT-260805231815bd7846', 'BKP-000001', NULL, NULL, 'ALT-000002', NULL, 'Alert Published', 'Your pesticide alert \"Insecticide Application\" has been published and sent to 0 beekeeper(s). None of them are inside the 5.0 km danger radius. Your own apiary is approx. 2.03 km from the site (risk level: Medium).', 'pesticide_alert', 0, '2026-08-06 07:18:15'),
('NT-260805231828379c8a', 'BKP-000001', NULL, NULL, 'ALT-000003', NULL, 'Alert Published', 'Your pesticide alert \"Insecticide Application\" has been published and sent to 0 beekeeper(s). None of them are inside the 5.0 km danger radius. Your own apiary is approx. 18.64 km from the site (risk level: Low).', 'pesticide_alert', 0, '2026-08-06 07:18:28'),
('NT-260805233830043a41', 'BKP-000001', NULL, NULL, NULL, NULL, 'Hive Monitoring Advised', 'HV-000002: Hive is currently marked \'Needs Attention\' — monitor closely.', 'queen_recommendation', 0, '2026-08-06 07:38:30'),
('NT-260805233920d0b0a7', 'BKP-000001', NULL, NULL, NULL, NULL, 'Hive Monitoring Advised', 'HV-000003: Hive is currently marked \'Weak\' — monitor closely.', 'queen_recommendation', 0, '2026-08-06 07:39:20'),
('NT-260805234038577649', 'BKP-000001', NULL, NULL, NULL, NULL, 'Queen Replacement Recommended', 'HV-000004: Hive is currently marked \'Diseased\' — queen replacement recommended.', 'queen_recommendation', 0, '2026-08-06 07:40:38'),
('NT-260805234121c109eb', 'BKP-000001', NULL, NULL, NULL, NULL, 'Queen Replacement Recommended', 'HV-000002: Latest harvest 50.00 kg is 50.0% of the historical baseline 100.00 kg (threshold 60%).', 'queen_recommendation', 0, '2026-08-06 07:41:21'),
('NT-260805234132164178', 'BKP-000001', NULL, NULL, NULL, NULL, 'Queen Replacement Recommended', 'HV-000003: Latest harvest 10.00 kg is 10.0% of the historical baseline 100.00 kg (threshold 60%).', 'queen_recommendation', 0, '2026-08-06 07:41:32'),
('NT-2608052341546e4832', 'BKP-000001', NULL, NULL, NULL, NULL, 'Queen Replacement Recommended', 'HV-000004: Latest harvest 5.00 kg is 5.0% of the historical baseline 100.00 kg (threshold 60%).', 'queen_recommendation', 0, '2026-08-06 07:41:54'),
('NT-2608060008206bcac2', 'BKP-000001', NULL, NULL, NULL, NULL, 'Queen Replacement Recommended', 'HV-000003: Latest harvest 10.00 kg is 10.0% of the historical baseline 100.00 kg (threshold 60%).', 'queen_recommendation', 0, '2026-08-06 08:08:20'),
('NT-260806001029118d4c', 'BKP-000001', NULL, NULL, NULL, NULL, 'Queen Replacement Recommended', 'HV-000002: Latest harvest 50.00 kg is 50.0% of the historical baseline 100.00 kg (threshold 60%).', 'queen_recommendation', 0, '2026-08-06 08:10:29'),
('NT-260806001514b59310', 'BKP-000001', NULL, NULL, NULL, NULL, 'Hive Monitoring Advised', 'HV-000002: Hive is currently marked \'Needs Attention\' — monitor closely.', 'queen_recommendation', 0, '2026-08-06 08:15:14'),
('NT-260806001521cc3f5b', 'BKP-000001', NULL, NULL, NULL, NULL, 'Queen Replacement Recommended', 'HV-000002: Latest harvest 50.00 kg is 50.0% of the historical baseline 100.00 kg (threshold 60%).', 'queen_recommendation', 0, '2026-08-06 08:15:21'),
('NT-2608060018303a1da5', 'BKP-000001', NULL, NULL, NULL, NULL, 'Queen Replacement Recommended', 'HV-000002: Latest harvest 50.00 kg is 50.0% of the historical baseline 100.00 kg (threshold 60%).', 'queen_recommendation', 0, '2026-08-06 08:18:30'),
('NT-260806004124ce54cd', 'BKP-000002', NULL, NULL, 'ALT-000004', NULL, 'Pesticide Alert: Insecticide A', 'A Insecticide application (reported by a fellow beekeeper (John Evans Lacuas Gutierrez)) has been posted in your area. Your apiary is outside the 5.0 km danger radius, so no direct action is required — tap to view details.', 'pesticide_alert', 0, '2026-08-06 08:41:24'),
('NT-260806004124d9753e', 'BKP-000001', NULL, NULL, 'ALT-000004', NULL, 'Alert Published', 'Your pesticide alert \"Insecticide Application\" has been published and sent to 1 beekeeper(s). None of them are inside the 5.0 km danger radius. Your own apiary is approx. 5.48 km from the site (risk level: Low).', 'pesticide_alert', 0, '2026-08-06 08:41:24'),
('NT-260806004230a4f62c', 'BKP-000002', NULL, NULL, 'ALT-000005', NULL, 'Alert Published', 'Your pesticide alert \"Insecticide Application\" has been published and sent to 1 beekeeper(s). 1 of them are inside the 5.0 km danger radius. Your own apiary is approx. 0.15 km from the site (risk level: High).', 'pesticide_alert', 0, '2026-08-06 08:42:30'),
('NT-260806004230ab7020', 'BKP-000001', NULL, NULL, 'ALT-000005', NULL, 'Pesticide Alert: Insecticide A', 'A Insecticide application (reported by a fellow beekeeper (Reiana Mari Mandeoya Faiganan)) is scheduled within 5.0 km of your apiary (approx. 0.15 km away). Risk level: High.', 'pesticide_alert', 0, '2026-08-06 08:42:30'),
('NT-2608070507346236fb', 'BKP-000001', NULL, NULL, NULL, NULL, 'Queen Replacement Recommended', 'HV-000003: Latest harvest 10.00 kg is 10.0% of the historical baseline 100.00 kg (threshold 60%).', 'queen_recommendation', 0, '2026-08-07 13:07:34'),
('NT-2608070513577d96e2', 'BKP-000001', NULL, NULL, NULL, NULL, 'Queen Replacement Recommended', 'HV-000003: Latest harvest 10.00 kg is 10.0% of the historical baseline 100.00 kg (threshold 60%).', 'queen_recommendation', 0, '2026-08-07 13:13:57'),
('NT-2608070523058fa539', 'BKP-000001', NULL, NULL, NULL, NULL, 'Queen Replacement Recommended', 'HV-000003: Latest harvest 10.00 kg is 10.0% of the historical baseline 100.00 kg (threshold 60%).', 'queen_recommendation', 0, '2026-08-07 13:23:05'),
('NT-260807052803e43071', 'BKP-000001', NULL, NULL, NULL, NULL, 'Queen Replacement Recommended', 'HV-000003: Latest harvest 10.00 kg is 10.0% of the historical baseline 100.00 kg (threshold 60%).', 'queen_recommendation', 0, '2026-08-07 13:28:03'),
('NT-26080705281524924b', 'BKP-000001', NULL, NULL, NULL, NULL, 'Queen Replacement Recommended', 'HV-000002: Latest harvest 50.00 kg is 50.0% of the historical baseline 100.00 kg (threshold 60%).', 'queen_recommendation', 0, '2026-08-07 13:28:15'),
('NT-26080705283382d073', 'BKP-000001', NULL, NULL, NULL, NULL, 'Queen Replacement Recommended', 'HV-000003: Latest harvest 10.00 kg is 10.0% of the historical baseline 100.00 kg (threshold 60%).', 'queen_recommendation', 0, '2026-08-07 13:28:33'),
('NT-2608070556010a9866', 'BKP-000001', NULL, NULL, NULL, NULL, 'Queen Replacement Recommended', 'HV-000003: Latest harvest 10.00 kg is 10.0% of the historical baseline 100.00 kg (threshold 60%).', 'queen_recommendation', 0, '2026-08-07 13:56:01'),
('NT-260807055628da90f9', 'BKP-000001', NULL, NULL, NULL, NULL, 'Queen Replacement Recommended', 'HV-000003: Latest harvest 10.00 kg is 10.0% of the historical baseline 100.00 kg (threshold 60%).', 'queen_recommendation', 0, '2026-08-07 13:56:28'),
('NT-260908104944354809', 'BKP-000001', NULL, NULL, NULL, NULL, 'Hive Monitoring Advised', 'HV-000005: Hive is currently marked \'Weak\' — monitor closely.', 'queen_recommendation', 0, '2026-09-08 18:49:44'),
('NT-2609090019284ff723', 'BKP-000001', NULL, NULL, NULL, NULL, 'Queen Replacement Recommended', 'HV-000006: Hive is currently marked \'Weak\' — queen replacement recommended.', 'queen_recommendation', 0, '2026-09-09 08:19:28'),
('NT-260909002734171b67', 'BKP-000001', NULL, NULL, NULL, NULL, 'Queen Replacement Recommended', 'HV-000006: Hive is currently marked \'Weak\' — queen replacement recommended.', 'queen_recommendation', 0, '2026-09-09 08:27:34'),
('NT-260909003745faa033', 'BKP-000001', NULL, NULL, NULL, NULL, 'Queen Replacement Recommended', 'HV-000006: Hive is currently marked \'Weak\' — queen replacement recommended.', 'queen_recommendation', 0, '2026-09-09 08:37:45'),
('NT-2609090041298d0d03', 'BKP-000001', NULL, NULL, NULL, NULL, 'Queen Replacement Recommended', 'HV-000006: Hive is currently marked \'Weak\' — queen replacement recommended.', 'queen_recommendation', 0, '2026-09-09 08:41:29'),
('NT-260909004200d2447e', 'BKP-000001', NULL, NULL, NULL, NULL, 'Queen Replacement Recommended', 'HV-000006: Hive is currently marked \'Needs Attention\' — queen replacement recommended.', 'queen_recommendation', 0, '2026-09-09 08:42:00'),
('NT-26090900504197de87', 'BKP-000001', NULL, NULL, NULL, NULL, 'Queen Replacement Recommended', 'HV-000006: Hive is currently marked \'Weak\' — queen replacement recommended.', 'queen_recommendation', 0, '2026-09-09 08:50:41'),
('NT-2609280316550a1324', 'BKP-000001', NULL, NULL, NULL, NULL, 'Account Verified', 'Your beekeeper account has been verified. You can now view bee reports and send rescue offers.', 'verification', 0, '2026-09-28 11:16:55'),
('NT-2609280326095eef14', NULL, 'CTZ-000001', NULL, NULL, 'RPT-000005', 'New Rescue Offer', 'John Evans Lacuas Gutierrez offered PHP 5,000 for report RPT-000005. Tap to view and accept or reject it.', 'rescue_offer', 1, '2026-09-28 11:26:09'),
('NT-260928032650e87a9f', 'BKP-000001', NULL, NULL, NULL, 'RPT-000005', 'Offer Accepted!', 'The citizen accepted your offer on report RPT-000005. Message them to arrange the rescue.', 'offer_update', 0, '2026-09-28 11:26:50'),
('NT-2609280327025107c6', 'BKP-000001', NULL, NULL, NULL, 'RPT-000005', 'Rescue Resolved', 'The citizen marked the rescue for report RPT-000005 as resolved. Thank you for helping the bees!', 'rescue_resolved', 0, '2026-09-28 11:27:02'),
('NT-260928043751063304', 'BKP-000001', NULL, NULL, 'ALT-000006', NULL, 'Alert Submitted', 'Your pesticide alert \"Fungicide Application\" was sent to the admin for review. It will be shown to other beekeepers once it\'s approved.', 'pesticide_alert', 0, '2026-09-28 12:37:51'),
('NT-2609280439000a245d', 'BKP-000002', NULL, NULL, 'ALT-000006', NULL, 'Pesticide Alert: Fungicide App', 'A Fungicide application (reported by a fellow beekeeper (John Evans Lacuas Gutierrez)) is scheduled within 3.0 km of your apiary (approx. 0.51 km away). Risk level: High.', 'pesticide_alert', 0, '2026-09-28 12:39:00'),
('NT-260928043900c516e2', 'BKP-000001', NULL, NULL, 'ALT-000006', NULL, 'Alert Approved', 'Your pesticide alert \"Fungicide Application\" was approved by the admin and sent to 1 beekeeper(s). 1 of them are inside the 3.0 km danger radius. Your own apiary is approx. 0.51 km from the site (risk level: High).', 'pesticide_alert', 0, '2026-09-28 12:39:00'),
('NT-2609280611094f78c9', NULL, 'CTZ-000001', NULL, NULL, 'RPT-000004', 'New Rescue Offer', 'John Evans Lacuas Gutierrez offered PHP 10,000 for report RPT-000004. Tap to view and accept or reject it.', 'rescue_offer', 1, '2026-09-28 14:11:09'),
('NT-26092806122718d2a9', 'BKP-000001', NULL, NULL, NULL, 'RPT-000004', 'Offer Not Accepted', 'The citizen declined your offer on report RPT-000004.', 'offer_update', 0, '2026-09-28 14:12:27'),
('NT-260928061719624f1f', NULL, 'CTZ-000001', NULL, NULL, 'RPT-000003', 'New Rescue Offer', 'John Evans Lacuas Gutierrez offered PHP 10,000 for report RPT-000003. Tap to view and accept or reject it.', 'rescue_offer', 1, '2026-09-28 14:17:19'),
('NT-26092806182097067e', 'BKP-000001', NULL, NULL, NULL, 'RPT-000003', 'Offer Accepted!', 'The citizen accepted your offer on report RPT-000003. Message them to arrange the rescue.', 'offer_update', 0, '2026-09-28 14:18:20'),
('NT-26092806182433f5f2', 'BKP-000001', NULL, NULL, NULL, 'RPT-000003', 'Report Cancelled', 'The citizen cancelled report RPT-000003. Your offer is no longer needed.', 'offer_update', 0, '2026-09-28 14:18:24'),
('NT-260928062251fbd952', NULL, 'CTZ-000001', NULL, NULL, 'RPT-000002', 'New Rescue Offer', 'John Evans Lacuas Gutierrez offered a free rescue for report RPT-000002. Tap to view and accept or reject it.', 'rescue_offer', 1, '2026-09-28 14:22:51'),
('NT-260928063026106488', 'BKP-000001', NULL, NULL, NULL, 'RPT-000002', 'Offer Accepted!', 'The citizen accepted your offer on report RPT-000002. Message them to arrange the rescue.', 'offer_update', 0, '2026-09-28 14:30:26'),
('NT-2609280631546d0684', 'BKP-000001', NULL, NULL, NULL, 'RPT-000002', 'Rescue Resolved', 'The citizen marked the rescue for report RPT-000002 as resolved. Thank you for helping the bees!', 'rescue_resolved', 0, '2026-09-28 14:31:54'),
('NT-260928064418e1ee68', NULL, 'CTZ-000001', NULL, NULL, 'RPT-000004', 'New Rescue Offer', 'John Evans Lacuas Gutierrez sent a new offer: PHP 1,000 for report RPT-000004. Tap to view and accept or reject it.', 'rescue_offer', 0, '2026-09-28 14:44:18'),
('NT-2609280645270756c5', 'BKP-000001', NULL, NULL, NULL, 'RPT-000004', 'Offer Accepted!', 'The citizen accepted your offer on report RPT-000004. Message them to arrange the rescue.', 'offer_update', 0, '2026-09-28 14:45:27'),
('NT-260928111541347fec', NULL, NULL, 'ADM-000001', NULL, 'RPT-000006', 'New Swarm Report', 'A citizen reported Apis mellifera (Western Honey Bee). It may be dangerous. Tap to view report RPT-000006.', 'new_report', 1, '2026-09-28 19:15:41'),
('NT-26092811154191b530', 'BKP-000001', NULL, NULL, NULL, 'RPT-000006', 'New Bee Rescue Report', 'Apis mellifera (Western Honey Bee) was reported 18.0 km from your farm. Tap to view it and make an offer.', 'rescue_report', 0, '2026-09-28 19:15:41'),
('NT-2609281116189290a2', NULL, 'CTZ-000001', NULL, NULL, 'RPT-000006', 'New Rescue Offer', 'John Evans Lacuas Gutierrez offered PHP 1,000 for report RPT-000006. Tap to view and accept or reject it.', 'rescue_offer', 0, '2026-09-28 19:16:18'),
('NT-2609281116578252fb', 'BKP-000001', NULL, NULL, NULL, 'RPT-000006', 'Offer Not Accepted', 'The citizen declined your offer on report RPT-000006.', 'offer_update', 0, '2026-09-28 19:16:57'),
('NT-2609281117181159b2', NULL, 'CTZ-000001', NULL, NULL, 'RPT-000006', 'New Rescue Offer', 'John Evans Lacuas Gutierrez sent a new offer: PHP 500 for report RPT-000006. Tap to view and accept or reject it.', 'rescue_offer', 0, '2026-09-28 19:17:18')
-- @@END@@

-- Table `otp_codes`
DROP TABLE IF EXISTS `otp_codes`
-- @@END@@
CREATE TABLE `otp_codes` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `email` varchar(50) NOT NULL,
  `role` varchar(20) NOT NULL,
  `code_hash` varchar(255) NOT NULL,
  `purpose` varchar(30) NOT NULL DEFAULT 'email_verification',
  `attempts` int(11) NOT NULL DEFAULT 0,
  `consumed` tinyint(1) NOT NULL DEFAULT 0,
  `expires_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_otp_email_purpose` (`email`,`purpose`,`consumed`),
  CONSTRAINT `chk_otp_role` CHECK (`role` in ('citizen','beekeeper')),
  CONSTRAINT `chk_otp_purpose` CHECK (`purpose` in ('email_verification','password_reset'))
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@END@@
INSERT INTO `otp_codes` (`id`, `email`, `role`, `code_hash`, `purpose`, `attempts`, `consumed`, `expires_at`, `created_at`) VALUES
(5, 'johnevansgutierrez9@gmail.com', 'beekeeper', '33df7f264eec6182df9b40c6c7ad012c2d9426915bd338ff8250d281b3ce02b6', 'email_verification', 0, 1, '2026-08-02 11:03:58', '2026-08-02 03:03:29'),
(6, 'sucriana@gmail.com', 'beekeeper', '357afb83ad5a55fcb4af6b5fc45f47230e9e1c2232ff891b8ef082689814e67f', 'email_verification', 0, 1, '2026-08-05 16:52:26', '2026-08-05 08:52:02'),
(7, 'sylcrosylpha@gmail.com', 'beekeeper', '16aa16e951d890a360c4d1f996e63bf3e95dd4a86ff332aefa0f5f1ffd1df325', 'email_verification', 0, 1, '2026-09-29 09:25:02', '2026-08-05 11:12:37'),
(8, 'jmjacolbiapogi@gmail.com', 'beekeeper', '1b699813adc64078a1c3e496991821ce34026d98a0754b36b6648e2c6e47be29', 'email_verification', 0, 1, '2026-08-05 23:50:46', '2026-08-05 15:50:14'),
(9, 'johnevansgutierrez9@gmail.com', 'beekeeper', '22dc211f7d32d58943e59a18e9e3b14b786c7250acb8aaf5b8f034c120dfb50f', 'email_verification', 0, 1, '2026-08-06 07:16:37', '2026-08-05 23:16:16'),
(10, 'sucriana@gmail.com', 'beekeeper', '4a7b6ce7565990959636548bf5ac26a83c52b0426ee06f24beb3214ad575b6fe', 'email_verification', 0, 1, '2026-08-06 08:39:58', '2026-08-06 00:39:42'),
(11, 'sylcrosylphy@gmail.com', 'citizen', '3cba86a93ee6923a1b396f17df123e8b2fcd7a95621da4c10529a5c132daf5f0', 'email_verification', 0, 1, '2026-09-21 01:34:10', '2026-09-20 17:29:11'),
(12, 'sylcrosylphy@gmail.com', 'citizen', 'fadf662e51fe34973faf2fd1315be4cec6e87de7f1a68260946fc1374f5ad72d', 'email_verification', 0, 1, '2026-09-21 01:45:00', '2026-09-20 17:34:10'),
(13, 'sylcrosylphy@gmail.com', 'citizen', '0f529ecdb1ae546bf0ff5ff29e2a424d183e4f6d66d0ff419fa6fd9dc6014404', 'email_verification', 0, 1, '2026-09-21 01:55:34', '2026-09-20 17:45:00'),
(14, 'sylcrosylphy@gmail.com', 'citizen', '0ce6099ac58d67dc54167c57faf3a134a9d012529900a0eeb7b94f6e7858bb33', 'email_verification', 0, 1, '2026-09-21 01:55:52', '2026-09-20 17:55:34'),
(17, 'sylcrosylpha@gmail.com', 'beekeeper', '66702e40f8373147469a7a28f8ee341b28984a8833f9dfda60b68d65f8674284', 'email_verification', 0, 1, '2026-09-29 13:00:05', '2026-09-29 04:58:36')
-- @@END@@

-- Table `push_subscriptions`
DROP TABLE IF EXISTS `push_subscriptions`
-- @@END@@
CREATE TABLE `push_subscriptions` (
  `subscription_id` int(11) NOT NULL AUTO_INCREMENT,
  `role` varchar(10) NOT NULL,
  `user_id` varchar(15) NOT NULL,
  `endpoint` varchar(700) NOT NULL,
  `endpoint_hash` char(64) NOT NULL,
  `p256dh` varchar(200) NOT NULL,
  `auth` varchar(100) NOT NULL,
  `user_agent` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `last_sent_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`subscription_id`),
  UNIQUE KEY `uq_push_subscriptions_endpoint` (`endpoint_hash`),
  KEY `idx_push_subscriptions_user` (`role`,`user_id`),
  CONSTRAINT `chk_push_subscriptions_role` CHECK (`role` in ('admin','citizen','beekeeper'))
) ENGINE=InnoDB AUTO_INCREMENT=56 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@END@@
INSERT INTO `push_subscriptions` (`subscription_id`, `role`, `user_id`, `endpoint`, `endpoint_hash`, `p256dh`, `auth`, `user_agent`, `created_at`, `last_sent_at`) VALUES
(1, 'beekeeper', 'BKP-000001', 'https://fcm.googleapis.com/fcm/send/cE_CNFWeKrA:APA91bFzP5ikuraP-9NuUMS1sCKu_dQuOlY9JUIL_linA5kxEzIiKwsuwpVr9d4mgfEhZnLbRexO_eK_pz7NtWg20Ymw6a4OK7c_YXyN6ESB8znqtXkJT2L91LJj5I10oLUkgge1lLrU', 'b26ff11300446925e1a1318fec9d98a25d5f2b221259f2276ebcefc538455e07', 'BLkI5KNjahC-yzlKdi_-Yn6LSpxL-86aLsfsd-wNKE0y4vobcYSGlsEmnnyG8QNlEEkk4BpPZP9c6AD2A5KKC8w', 'JznI1cRsdyiR17BYrJIQeA', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36', '2026-09-28 14:03:35', '2026-09-29 12:41:01'),
(44, 'beekeeper', 'BKP-000001', 'https://fcm.googleapis.com/fcm/send/diod9YCcWxA:APA91bHh7ZEcc5y-mL9qEwXixZfmP7vgXxsamcZedo4y0P2Kev7KL3RDx0y1wfBKl-Ont3pjRy4SPdgx_89uCWbYNjnSw6KMLRKB-h4ELEUmQ5IJDVuqC8MMt1TjewRRs77YKVAauVW8', '27cace3e6f3c23a7ee3715014ef59940be88142ed1a494f56023824daf5c410f', 'BPa_QfWAkbVgyEQXChcMB9-SsuXwpfKWSQCSMFcbEdSTDOH-H2DN1v3ZLbNMu6eUdF0niBHZGP4QPIyA1VA98fM', 'PZ2P_7-y5AipInZcY6UpDw', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36', '2026-09-29 12:02:03', '2026-09-29 12:41:01')
-- @@END@@

-- Table `queen_recommendations`
DROP TABLE IF EXISTS `queen_recommendations`
-- @@END@@
CREATE TABLE `queen_recommendations` (
  `recommendation_id` varchar(15) NOT NULL,
  `hive_id` varchar(15) NOT NULL,
  `beekeeper_id` varchar(15) NOT NULL,
  `level` varchar(20) NOT NULL,
  `reason_code` varchar(40) NOT NULL,
  `reason` varchar(255) NOT NULL,
  `yield_baseline_kg` decimal(10,2) DEFAULT NULL,
  `yield_current_kg` decimal(10,2) DEFAULT NULL,
  `yield_pct` decimal(6,2) DEFAULT NULL,
  `queen_age_days` int(11) DEFAULT NULL,
  `evaluated_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `acknowledged_at` timestamp NULL DEFAULT NULL,
  `resolved_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`recommendation_id`),
  KEY `idx_queen_recs_beekeeper` (`beekeeper_id`,`evaluated_at`),
  KEY `idx_queen_recs_hive_open` (`hive_id`,`resolved_at`),
  CONSTRAINT `fk_queen_recs_beekeeper` FOREIGN KEY (`beekeeper_id`) REFERENCES `beekeepers` (`beekeeperID`) ON UPDATE CASCADE,
  CONSTRAINT `fk_queen_recs_hive` FOREIGN KEY (`hive_id`) REFERENCES `hives` (`hive_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_queen_recs_level` CHECK (`level` in ('Normal','Monitor','Replace'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@END@@
INSERT INTO `queen_recommendations` (`recommendation_id`, `hive_id`, `beekeeper_id`, `level`, `reason_code`, `reason`, `yield_baseline_kg`, `yield_current_kg`, `yield_pct`, `queen_age_days`, `evaluated_at`, `acknowledged_at`, `resolved_at`) VALUES
('REC-000001', 'HV-000001', 'BKP-000001', 'Normal', 'NORMAL', 'Hive is performing within expected parameters.', 100.00, NULL, NULL, 5, '2026-08-06 07:37:51', NULL, NULL),
('REC-000002', 'HV-000002', 'BKP-000001', 'Monitor', 'HEALTH_STATUS_FLAGGED', 'Hive is currently marked \'Needs Attention\' — monitor closely.', 100.00, NULL, NULL, 36, '2026-08-06 07:38:30', NULL, '2026-08-06 07:41:21'),
('REC-000003', 'HV-000003', 'BKP-000001', 'Monitor', 'HEALTH_STATUS_FLAGGED', 'Hive is currently marked \'Weak\' — monitor closely.', 100.00, NULL, NULL, 66, '2026-08-06 07:39:20', NULL, '2026-08-06 07:41:32'),
('REC-000004', 'HV-000004', 'BKP-000001', 'Replace', 'HEALTH_STATUS_DISEASED', 'Hive is currently marked \'Diseased\' — queen replacement recommended.', 100.00, NULL, NULL, 97, '2026-08-06 07:40:38', NULL, '2026-08-06 07:41:54'),
('REC-000005', 'HV-000002', 'BKP-000001', 'Replace', 'YIELD_BELOW_60_PCT', 'Latest harvest 50.00 kg is 50.0% of the historical baseline 100.00 kg (threshold 60%).', 100.00, 50.00, 50.00, 36, '2026-08-06 07:41:21', NULL, '2026-08-06 08:10:29'),
('REC-000006', 'HV-000003', 'BKP-000001', 'Replace', 'YIELD_BELOW_60_PCT', 'Latest harvest 10.00 kg is 10.0% of the historical baseline 100.00 kg (threshold 60%).', 100.00, 10.00, 10.00, 66, '2026-08-06 07:41:32', NULL, '2026-08-06 08:08:20'),
('REC-000007', 'HV-000004', 'BKP-000001', 'Replace', 'YIELD_BELOW_60_PCT', 'Latest harvest 5.00 kg is 5.0% of the historical baseline 100.00 kg (threshold 60%).', 100.00, 5.00, 5.00, 97, '2026-08-06 07:41:54', NULL, '2026-08-07 13:22:27'),
('REC-000008', 'HV-000003', 'BKP-000001', 'Replace', 'YIELD_BELOW_60_PCT', 'Latest harvest 10.00 kg is 10.0% of the historical baseline 100.00 kg (threshold 60%).', 100.00, 10.00, 10.00, 0, '2026-08-06 08:08:20', NULL, '2026-08-07 13:07:34'),
('REC-000009', 'HV-000002', 'BKP-000001', 'Replace', 'YIELD_BELOW_60_PCT', 'Latest harvest 50.00 kg is 50.0% of the historical baseline 100.00 kg (threshold 60%).', 100.00, 50.00, 50.00, 0, '2026-08-06 08:10:29', NULL, '2026-08-06 08:15:14'),
('REC-000010', 'HV-000002', 'BKP-000001', 'Monitor', 'HEALTH_STATUS_FLAGGED', 'Hive is currently marked \'Needs Attention\' — monitor closely.', 100.00, 100.00, 100.00, 0, '2026-08-06 08:15:14', NULL, '2026-08-06 08:15:21'),
('REC-000011', 'HV-000002', 'BKP-000001', 'Replace', 'YIELD_BELOW_60_PCT', 'Latest harvest 50.00 kg is 50.0% of the historical baseline 100.00 kg (threshold 60%).', 100.00, 50.00, 50.00, 0, '2026-08-06 08:15:21', NULL, '2026-08-06 08:18:30'),
('REC-000012', 'HV-000002', 'BKP-000001', 'Replace', 'YIELD_BELOW_60_PCT', 'Latest harvest 50.00 kg is 50.0% of the historical baseline 100.00 kg (threshold 60%).', 100.00, 50.00, 50.00, 0, '2026-08-06 08:18:30', NULL, '2026-08-07 13:26:06'),
('REC-000013', 'HV-000003', 'BKP-000001', 'Replace', 'YIELD_BELOW_60_PCT', 'Latest harvest 10.00 kg is 10.0% of the historical baseline 100.00 kg (threshold 60%).', 100.00, 10.00, 10.00, 0, '2026-08-07 13:07:34', NULL, '2026-08-07 13:13:57'),
('REC-000014', 'HV-000003', 'BKP-000001', 'Replace', 'YIELD_BELOW_60_PCT', 'Latest harvest 10.00 kg is 10.0% of the historical baseline 100.00 kg (threshold 60%).', 100.00, 10.00, 10.00, 0, '2026-08-07 13:13:57', NULL, '2026-08-07 13:21:03'),
('REC-000015', 'HV-000003', 'BKP-000001', 'Normal', 'NORMAL', 'Hive is performing within expected parameters.', 100.00, 10.00, 10.00, 0, '2026-08-07 13:21:03', NULL, '2026-09-09 08:25:57'),
('REC-000016', 'HV-000004', 'BKP-000001', 'Normal', 'NORMAL', 'Hive is performing within expected parameters.', 100.00, 5.00, 5.00, 0, '2026-08-07 13:22:27', NULL, NULL),
('REC-000017', 'HV-000003', 'BKP-000001', 'Replace', 'YIELD_BELOW_60_PCT', 'Latest harvest 10.00 kg is 10.0% of the historical baseline 100.00 kg (threshold 60%).', 100.00, 10.00, 10.00, 0, '2026-08-07 13:23:05', NULL, '2026-08-07 13:26:01'),
('REC-000018', 'HV-000002', 'BKP-000001', 'Normal', 'NORMAL', 'Hive is performing within expected parameters.', 100.00, 50.00, 50.00, 0, '2026-08-07 13:26:06', NULL, '2026-09-09 08:25:57'),
('REC-000019', 'HV-000003', 'BKP-000001', 'Replace', 'YIELD_BELOW_60_PCT', 'Latest harvest 10.00 kg is 10.0% of the historical baseline 100.00 kg (threshold 60%).', 100.00, 10.00, 10.00, 0, '2026-08-07 13:28:03', NULL, '2026-08-07 13:28:33'),
('REC-000020', 'HV-000002', 'BKP-000001', 'Replace', 'YIELD_BELOW_60_PCT', 'Latest harvest 50.00 kg is 50.0% of the historical baseline 100.00 kg (threshold 60%).', 100.00, 50.00, 50.00, 0, '2026-08-07 13:28:15', NULL, NULL),
('REC-000021', 'HV-000003', 'BKP-000001', 'Replace', 'YIELD_BELOW_60_PCT', 'Latest harvest 10.00 kg is 10.0% of the historical baseline 100.00 kg (threshold 60%).', 100.00, 10.00, 10.00, 0, '2026-08-07 13:28:33', NULL, '2026-08-07 13:54:25'),
('REC-000022', 'HV-000003', 'BKP-000001', 'Replace', 'YIELD_BELOW_60_PCT', 'Latest harvest 10.00 kg is 10.0% of the historical baseline 100.00 kg (threshold 60%).', 100.00, 10.00, 10.00, 0, '2026-08-07 13:56:01', NULL, '2026-08-07 13:56:23'),
('REC-000023', 'HV-000003', 'BKP-000001', 'Replace', 'YIELD_BELOW_60_PCT', 'Latest harvest 10.00 kg is 10.0% of the historical baseline 100.00 kg (threshold 60%).', 100.00, 10.00, 10.00, 0, '2026-08-07 13:56:28', NULL, NULL),
('REC-000024', 'HV-000005', 'BKP-000001', 'Normal', 'NORMAL', 'Hive is performing within expected parameters.', 100.00, NULL, NULL, 38, '2026-09-08 18:49:18', NULL, '2026-09-09 08:25:57'),
('REC-000025', 'HV-000005', 'BKP-000001', 'Monitor', 'HEALTH_STATUS_FLAGGED', 'Hive is currently marked \'Weak\' — monitor closely.', 100.00, NULL, NULL, 38, '2026-09-08 18:49:44', NULL, '2026-09-08 18:52:15'),
('REC-000036', 'HV-000006', 'BKP-000001', 'Replace', 'HEALTH_STATUS_FLAGGED', 'Hive is currently marked \'Weak\' — queen replacement recommended.', 100.00, NULL, NULL, 0, '2026-09-09 08:50:41', NULL, NULL)
-- @@END@@

-- Table `ratings`
DROP TABLE IF EXISTS `ratings`
-- @@END@@
CREATE TABLE `ratings` (
  `rating_id` varchar(15) NOT NULL,
  `offer_id` varchar(15) NOT NULL,
  `citizenID` varchar(15) NOT NULL,
  `beekeeperID` varchar(15) NOT NULL,
  `rating_value` tinyint(4) NOT NULL,
  `comment` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`rating_id`),
  UNIQUE KEY `uq_ratings_offer` (`offer_id`),
  KEY `fk_ratings_citizen` (`citizenID`),
  KEY `fk_ratings_beekeeper` (`beekeeperID`),
  CONSTRAINT `fk_ratings_beekeeper` FOREIGN KEY (`beekeeperID`) REFERENCES `beekeepers` (`beekeeperID`) ON UPDATE CASCADE,
  CONSTRAINT `fk_ratings_citizen` FOREIGN KEY (`citizenID`) REFERENCES `citizens` (`citizenID`) ON UPDATE CASCADE,
  CONSTRAINT `fk_ratings_offer` FOREIGN KEY (`offer_id`) REFERENCES `rescue_offers` (`offer_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_ratings_value` CHECK (`rating_value` between 1 and 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@END@@
INSERT INTO `ratings` (`rating_id`, `offer_id`, `citizenID`, `beekeeperID`, `rating_value`, `comment`, `created_at`) VALUES
('RTG-000001', 'OFR-000001', 'CTZ-000001', 'BKP-000001', 5, NULL, '2026-09-28 11:27:10'),
('RTG-000002', 'OFR-000004', 'CTZ-000001', 'BKP-000001', 5, NULL, '2026-09-28 14:31:57')
-- @@END@@

-- Table `reports`
DROP TABLE IF EXISTS `reports`
-- @@END@@
CREATE TABLE `reports` (
  `reportID` varchar(15) NOT NULL,
  `citizenID` varchar(15) NOT NULL,
  `cvscan_id` varchar(15) NOT NULL,
  `image_url` varchar(255) NOT NULL,
  `ai_species_identified` varchar(50) NOT NULL,
  `sighted_at` datetime DEFAULT NULL,
  `latitude` decimal(10,8) NOT NULL,
  `longitude` decimal(11,8) NOT NULL,
  `bee_danger` varchar(5) NOT NULL,
  `description` varchar(50) DEFAULT NULL,
  `status` varchar(15) NOT NULL DEFAULT 'Pending',
  `reported_at` datetime NOT NULL DEFAULT current_timestamp(),
  `resolved_at` datetime DEFAULT NULL,
  `payment_status` varchar(20) NOT NULL DEFAULT 'Pending',
  `payment_method` varchar(20) DEFAULT 'Cash',
  `cancelled_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`reportID`),
  KEY `fk_reports_citizen` (`citizenID`),
  KEY `fk_reports_cvscan` (`cvscan_id`),
  CONSTRAINT `fk_reports_citizen` FOREIGN KEY (`citizenID`) REFERENCES `citizens` (`citizenID`) ON UPDATE CASCADE,
  CONSTRAINT `fk_reports_cvscan` FOREIGN KEY (`cvscan_id`) REFERENCES `cv_scans` (`cvscan_id`) ON UPDATE CASCADE,
  CONSTRAINT `chk_reports_bee_danger` CHECK (`bee_danger` in ('Yes','No')),
  CONSTRAINT `chk_reports_payment_status` CHECK (`payment_status` in ('Pending','Paid')),
  CONSTRAINT `chk_reports_status` CHECK (`status` in ('Pending','In Progress','Resolved','False Alarm','Cancelled'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@END@@
INSERT INTO `reports` (`reportID`, `citizenID`, `cvscan_id`, `image_url`, `ai_species_identified`, `sighted_at`, `latitude`, `longitude`, `bee_danger`, `description`, `status`, `reported_at`, `resolved_at`, `payment_status`, `payment_method`, `cancelled_at`) VALUES
('RPT-000001', 'CTZ-000001', 'CVS-000068', '/uploads/cv-scans/7bc0a27dc3a2434ea04ff85546bcff42_Apis-mellifera-yemenitica-the-local-bee.png', 'Apis Mellifera', '2026-09-28 08:13:00', 14.49205124, 121.01874038, 'Yes', 'Yow Yow', 'Cancelled', '2026-09-28 08:14:10', NULL, 'Pending', 'Cash', '2026-09-28 08:17:26'),
('RPT-000002', 'CTZ-000001', 'CVS-000068', '/uploads/cv-scans/7bc0a27dc3a2434ea04ff85546bcff42_Apis-mellifera-yemenitica-the-local-bee.png', 'Apis Mellifera', '2026-09-28 08:13:00', 14.49205124, 121.01874038, 'Yes', 'Yow Yow', 'Resolved', '2026-09-28 08:14:12', '2026-09-28 14:31:54', 'Pending', 'Cash', NULL),
('RPT-000003', 'CTZ-000001', 'CVS-000069', '/uploads/cv-scans/81792545ccc6430585074cf2b52b6e0f_F62DB6A0-0DEB-468B-8440-C3202479D9F0_frame_00080.jpg', 'Apis Cerana', '2026-09-28 08:51:00', 14.49208443, 121.01880002, 'Yes', 'Wassup', 'Cancelled', '2026-09-28 08:51:18', NULL, 'Pending', 'Cash', '2026-09-28 14:18:24'),
('RPT-000004', 'CTZ-000001', 'CVS-000070', '/uploads/cv-scans/a302cbc201b94a06bf6e080e00ea65f8_F62DB6A0-0DEB-468B-8440-C3202479D9F0_frame_00080.jpg', 'Apis Cerana', '2026-09-28 09:00:00', 14.49207325, 121.01879948, 'Yes', 'Wassup', 'In Progress', '2026-09-28 09:00:58', NULL, 'Pending', 'Cash', NULL),
('RPT-000005', 'CTZ-000001', 'CVS-000072', '/uploads/cv-scans/0b04c4ab5bec429690ea6de1fbf78bc3_received_1737121477643885.jpeg', 'Tetragonula biroi', '2026-09-28 09:19:00', 14.65291020, 121.02576163, 'Yes', 'Omsim', 'Resolved', '2026-09-28 09:20:11', '2026-09-28 11:27:02', 'Pending', 'Cash', NULL),
('RPT-000006', 'CTZ-000001', 'CVS-000073', '/uploads/cv-scans/6f53dd1d5bd74e7cac3a4bfe7fd0bc46_IMG_20260625_095949.jpg', 'Apis Mellifera', '2026-09-28 19:15:00', 14.65429342, 121.02814990, 'Yes', 'Yup', 'Pending', '2026-09-28 19:15:41', NULL, 'Pending', 'Cash', NULL)
-- @@END@@

-- Table `rescue_offers`
DROP TABLE IF EXISTS `rescue_offers`
-- @@END@@
CREATE TABLE `rescue_offers` (
  `offer_id` varchar(15) NOT NULL,
  `report_id` varchar(15) NOT NULL,
  `beekeeperID` varchar(15) NOT NULL,
  `offered_fee` decimal(10,2) NOT NULL,
  `offer_status` varchar(20) NOT NULL DEFAULT 'Pending',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `resolved_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`offer_id`),
  KEY `fk_rescue_offers_report` (`report_id`),
  KEY `fk_rescue_offers_beekeeper` (`beekeeperID`),
  CONSTRAINT `fk_rescue_offers_beekeeper` FOREIGN KEY (`beekeeperID`) REFERENCES `beekeepers` (`beekeeperID`) ON UPDATE CASCADE,
  CONSTRAINT `fk_rescue_offers_report` FOREIGN KEY (`report_id`) REFERENCES `reports` (`reportID`) ON UPDATE CASCADE,
  CONSTRAINT `chk_rescue_offers_status` CHECK (`offer_status` in ('Pending','Accepted','Rejected','Resolved'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@END@@
INSERT INTO `rescue_offers` (`offer_id`, `report_id`, `beekeeperID`, `offered_fee`, `offer_status`, `created_at`, `resolved_at`) VALUES
('OFR-000001', 'RPT-000005', 'BKP-000001', 5000.00, 'Resolved', '2026-09-28 11:26:09', '2026-09-28 11:27:02'),
('OFR-000002', 'RPT-000004', 'BKP-000001', 10000.00, 'Rejected', '2026-09-28 14:11:09', NULL),
('OFR-000003', 'RPT-000003', 'BKP-000001', 10000.00, 'Rejected', '2026-09-28 14:17:19', NULL),
('OFR-000004', 'RPT-000002', 'BKP-000001', 0.00, 'Resolved', '2026-09-28 14:22:51', '2026-09-28 14:31:54'),
('OFR-000005', 'RPT-000004', 'BKP-000001', 1000.00, 'Accepted', '2026-09-28 14:44:18', NULL),
('OFR-000006', 'RPT-000006', 'BKP-000001', 1000.00, 'Rejected', '2026-09-28 19:16:18', NULL),
('OFR-000007', 'RPT-000006', 'BKP-000001', 500.00, 'Pending', '2026-09-28 19:17:18', NULL)
-- @@END@@

-- Table `user_id_sequence`
DROP TABLE IF EXISTS `user_id_sequence`
-- @@END@@
CREATE TABLE `user_id_sequence` (
  `role` varchar(15) NOT NULL,
  `next_value` bigint(20) NOT NULL DEFAULT 1,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`role`),
  CONSTRAINT `chk_user_id_sequence_role` CHECK (`role` in ('citizen','beekeeper','admin','hive','yield','recommendation','alert','alert_recipient','cvscan','report','offer','rating','chat_report'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@END@@
INSERT INTO `user_id_sequence` (`role`, `next_value`, `updated_at`) VALUES
('admin', 2, '2026-09-28 10:57:54'),
('alert', 7, '2026-09-28 12:37:51'),
('alert_recipient', 9, '2026-09-28 12:39:00'),
('beekeeper', 4, '2026-09-29 12:58:36'),
('chat_report', 1, '2026-09-23 14:45:15'),
('citizen', 3, '2026-09-29 09:25:02'),
('cvscan', 99, '2026-09-29 13:08:52'),
('hive', 7, '2026-09-09 08:19:16'),
('offer', 8, '2026-09-28 19:17:18'),
('rating', 3, '2026-09-28 14:31:57'),
('recommendation', 37, '2026-09-09 08:50:41'),
('report', 7, '2026-09-28 19:15:41'),
('yield', 23, '2026-09-09 08:50:41')
-- @@END@@

-- Table `user_settings`
DROP TABLE IF EXISTS `user_settings`
-- @@END@@
CREATE TABLE `user_settings` (
  `role` varchar(10) NOT NULL,
  `user_id` varchar(15) NOT NULL,
  `setting_key` varchar(40) NOT NULL,
  `setting_value` varchar(20) NOT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`role`,`user_id`,`setting_key`),
  CONSTRAINT `chk_user_settings_role` CHECK (`role` in ('admin','citizen','beekeeper','system'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@END@@
INSERT INTO `user_settings` (`role`, `user_id`, `setting_key`, `setting_value`, `updated_at`) VALUES
('admin', 'ADM-000001', 'push_enabled', 'true', '2026-09-28 13:53:35'),
('system', 'system', 'auto_backup', 'true', '2026-09-28 13:21:03')
-- @@END@@

-- Table `yields`
DROP TABLE IF EXISTS `yields`
-- @@END@@
CREATE TABLE `yields` (
  `yield_id` varchar(15) NOT NULL,
  `hive_id` varchar(15) NOT NULL,
  `yield_date` date NOT NULL,
  `yield_kg` decimal(10,2) NOT NULL,
  `is_baseline` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `baseline_marker` varchar(15) GENERATED ALWAYS AS (case when `is_baseline` then `hive_id` else NULL end) STORED,
  PRIMARY KEY (`yield_id`),
  UNIQUE KEY `uq_yields_one_baseline_per_hive` (`baseline_marker`),
  KEY `idx_yields_hive_date` (`hive_id`,`yield_date`),
  KEY `idx_yields_baseline` (`hive_id`,`is_baseline`),
  CONSTRAINT `fk_yields_hive` FOREIGN KEY (`hive_id`) REFERENCES `hives` (`hive_id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@END@@
INSERT INTO `yields` (`yield_id`, `hive_id`, `yield_date`, `yield_kg`, `is_baseline`, `created_at`, `baseline_marker`) VALUES
('YLD-000001', 'HV-000001', '2026-12-31', 100.00, 1, '2026-08-06 07:37:51', 'HV-000001'),
('YLD-000002', 'HV-000002', '2026-12-31', 100.00, 1, '2026-08-06 07:38:30', 'HV-000002'),
('YLD-000003', 'HV-000003', '2026-12-31', 100.00, 1, '2026-08-06 07:39:20', 'HV-000003'),
('YLD-000004', 'HV-000004', '2026-12-31', 100.00, 1, '2026-08-06 07:40:38', 'HV-000004'),
('YLD-000005', 'HV-000001', '2026-08-02', 150.00, 0, '2026-08-06 07:40:51', NULL),
('YLD-000006', 'HV-000001', '2026-08-03', 200.00, 0, '2026-08-06 07:40:59', NULL),
('YLD-000007', 'HV-000001', '2026-08-04', 175.00, 0, '2026-08-06 07:41:08', NULL),
('YLD-000008', 'HV-000002', '2026-08-03', 50.00, 0, '2026-08-06 07:41:21', NULL),
('YLD-000009', 'HV-000003', '2026-08-03', 10.00, 0, '2026-08-06 07:41:32', NULL),
('YLD-000010', 'HV-000004', '2026-08-04', 5.00, 0, '2026-08-06 07:41:54', NULL),
('YLD-000011', 'HV-000002', '2026-08-06', 100.00, 0, '2026-08-06 08:15:14', NULL),
('YLD-000012', 'HV-000002', '2026-08-06', 50.00, 0, '2026-08-06 08:15:21', NULL),
('YLD-000013', 'HV-000005', '2026-12-31', 100.00, 1, '2026-09-08 18:49:18', 'HV-000005'),
('YLD-000014', 'HV-000005', '2026-09-01', 60.00, 0, '2026-09-08 18:49:44', NULL),
('YLD-000015', 'HV-000006', '2026-12-31', 100.00, 1, '2026-09-09 08:19:16', 'HV-000006'),
('YLD-000022', 'HV-000006', '2026-09-09', 60.00, 0, '2026-09-09 08:50:41', NULL)
-- @@END@@

SET FOREIGN_KEY_CHECKS = 1
-- @@END@@
