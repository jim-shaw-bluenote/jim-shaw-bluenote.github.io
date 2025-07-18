// get the ninja-keys element
const ninja = document.querySelector('ninja-keys');

// add the home and posts menu items
ninja.data = [{
    id: "nav-about",
    title: "about",
    section: "Navigation",
    handler: () => {
      window.location.href = "/";
    },
  },{id: "nav-blog",
          title: "blog",
          description: "",
          section: "Navigation",
          handler: () => {
            window.location.href = "/blog/";
          },
        },{id: "nav-publications",
          title: "publications",
          description: "",
          section: "Navigation",
          handler: () => {
            window.location.href = "/publications/";
          },
        },{id: "nav-software",
          title: "software",
          description: "",
          section: "Navigation",
          handler: () => {
            window.location.href = "/software/";
          },
        },{id: "nav-cv",
          title: "cv",
          description: "",
          section: "Navigation",
          handler: () => {
            window.location.href = "/cv/";
          },
        },{id: "post-developing-sylph-a-look-into-bioinformatics-tool-development",
        
          title: "Developing sylph - a look into bioinformatics tool development",
        
        description: "",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/blog/2024/developing-sylph/";
          
        },
      },{id: "post-thoughts-on-metagenomic-profiling-part-1-as-a-tool-developer",
        
          title: "Thoughts on metagenomic profiling. Part 1 - as a tool developer",
        
        description: "",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/blog/2023/profiling-development/";
          
        },
      },{id: "post-a-proof-sketch-of-seed-chain-extend-runtime-being-close-to-o-m-log-n",
        
          title: "A proof sketch of seed-chain-extend runtime being close to O(m log n)",
        
        description: "",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/blog/2022/almost-mlogn-bound-proof-sketch/";
          
        },
      },{id: "post-average-contig-length-times-1-6783469-is-equal-to-n50",
        
          title: "Average contig length times 1.6783469... is equal to N50",
        
        description: "",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/blog/2022/average-contig-length-n50/";
          
        },
      },{id: "books-the-godfather",
          title: 'The Godfather',
          description: "",
          section: "Books",handler: () => {
              window.location.href = "/books/the_godfather/";
            },},{id: "news-location-update-i-ll-be-in-the-toronto-area-from-mid-june-to-august-i-will-be-in-boston-from-september-onwards",
          title: 'Location update! I’ll be in the Toronto area from mid-June to August. I...',
          description: "",
          section: "News",},{id: "news-successfully-defended-my-phd",
          title: 'Successfully defended my PhD!',
          description: "",
          section: "News",},{id: "news-presented-our-work-on-floria-at-ismb-2024-which-is-now-published-in-bioinformatics",
          title: 'Presented our work on Floria at ISMB 2024, which is now published in...',
          description: "",
          section: "News",},{id: "news-our-paper-fairy-is-now-out-in-microbiome",
          title: 'Our paper fairy is now out in Microbiome.',
          description: "",
          section: "News",},{id: "news-starting-postdoc-in-boston-with-prof-heng-li",
          title: 'Starting postdoc in Boston with Prof. Heng Li.',
          description: "",
          section: "News",},{id: "news-our-metagenome-profiler-sylph-is-now-published-in-nature-biotechnology",
          title: 'Our metagenome profiler sylph is now published in Nature Biotechnology!',
          description: "",
          section: "News",},{id: "news-our-method-for-local-long-read-haplotyping-via-de-bruijn-graphs-devider-is-accepted-to-recomb-2025-see-you-in-seoul",
          title: 'Our method for local long-read haplotyping via de Bruijn graphs (devider) is accepted...',
          description: "",
          section: "News",},{id: "news-i-just-released-our-new-long-read-metagenome-assembler-myloasm-preprint-coming-in-the-next-few-months",
          title: 'I just released our new long-read metagenome assembler, myloasm! Preprint coming in the...',
          description: "",
          section: "News",},{id: "projects-project-1",
          title: 'project 1',
          description: "with background image",
          section: "Projects",handler: () => {
              window.location.href = "/projects/1_project/";
            },},{id: "projects-project-2",
          title: 'project 2',
          description: "a project with a background image and giscus comments",
          section: "Projects",handler: () => {
              window.location.href = "/projects/2_project/";
            },},{id: "projects-project-3-with-very-long-name",
          title: 'project 3 with very long name',
          description: "a project that redirects to another website",
          section: "Projects",handler: () => {
              window.location.href = "/projects/3_project/";
            },},{id: "projects-project-4",
          title: 'project 4',
          description: "another without an image",
          section: "Projects",handler: () => {
              window.location.href = "/projects/4_project/";
            },},{id: "projects-project-5",
          title: 'project 5',
          description: "a project with a background image",
          section: "Projects",handler: () => {
              window.location.href = "/projects/5_project/";
            },},{id: "projects-project-6",
          title: 'project 6',
          description: "a project with no image",
          section: "Projects",handler: () => {
              window.location.href = "/projects/6_project/";
            },},{id: "projects-project-7",
          title: 'project 7',
          description: "with background image",
          section: "Projects",handler: () => {
              window.location.href = "/projects/7_project/";
            },},{id: "projects-project-8",
          title: 'project 8',
          description: "an other project with a background image and giscus comments",
          section: "Projects",handler: () => {
              window.location.href = "/projects/8_project/";
            },},{id: "projects-project-9",
          title: 'project 9',
          description: "another project with an image 🎉",
          section: "Projects",handler: () => {
              window.location.href = "/projects/9_project/";
            },},{
        id: 'social-bluesky',
        title: 'Bluesky',
        section: 'Socials',
        handler: () => {
          window.open("https://bsky.app/profile/jimshaw.bsky.social", "_blank");
        },
      },{
        id: 'social-github',
        title: 'GitHub',
        section: 'Socials',
        handler: () => {
          window.open("https://github.com/bluenote-1577", "_blank");
        },
      },{
        id: 'social-scholar',
        title: 'Google Scholar',
        section: 'Socials',
        handler: () => {
          window.open("https://scholar.google.com/citations?user=hNAwGS8AAAAJ", "_blank");
        },
      },{
      id: 'light-theme',
      title: 'Change theme to light',
      description: 'Change the theme of the site to Light',
      section: 'Theme',
      handler: () => {
        setThemeSetting("light");
      },
    },
    {
      id: 'dark-theme',
      title: 'Change theme to dark',
      description: 'Change the theme of the site to Dark',
      section: 'Theme',
      handler: () => {
        setThemeSetting("dark");
      },
    },
    {
      id: 'system-theme',
      title: 'Use system default theme',
      description: 'Change the theme of the site to System Default',
      section: 'Theme',
      handler: () => {
        setThemeSetting("system");
      },
    },];
