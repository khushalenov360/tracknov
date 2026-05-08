
import fs from 'fs';

const filePath = 'c:\\Users\\91922\\Documents\\Codex\\2026-04-23-can-you-read-https-github-com\\harita\\lib\\data.ts';
let content = fs.readFileSync(filePath, 'utf8');

const targetBlock = `      const project = Array.isArray(membership.projects) ? membership.projects[0] : membership.projects;

      return {
        id: project.id,`;

const replacementBlock = `      const project = Array.isArray(membership.projects) ? membership.projects[0] : membership.projects;
      if (!project) return null;

      return {
        id: project.id,`;

const targetFilter = `    })
  );

  return summaries;`;

const replacementFilter = `    })
  );

  return summaries.filter(s => s !== null);`;

content = content.replace(targetBlock, replacementBlock);
content = content.replace(targetFilter, replacementFilter);

fs.writeFileSync(filePath, content);
console.log("Stability fix applied!");
