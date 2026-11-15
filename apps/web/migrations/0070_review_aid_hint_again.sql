-- Grades the Worker before #1040 wrote while that migration ran ahead of its deploy.
UPDATE `reviews` SET `aid` = 'hint' WHERE `aid` = 'hook';
