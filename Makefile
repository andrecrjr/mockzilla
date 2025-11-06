docker-build:
	docker build --no-cache -t mockzilla:latest .

nexus-deploy:
	@echo "$(GREEN)🐳 Construindo imagem Docker sem cache...$(NC)"
	make docker-build
	docker tag mockzilla:latest 10.230.43.182:5000/mockzilla:latest
	docker push 10.230.43.182:5000/mockzilla:latest
