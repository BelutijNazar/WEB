# Infrastructure Automation (Test Ansible Setup)

## Description
Automatization basic settings server with Ansible

##Opportunity
- install packages
- set hostname
- add records in /etc/hosts
- set timezone
- create groups team1
- set sudo witout password for groups

## Launch
```bash
ansible-playbook -i inventory.ini playbooks/base.yml
