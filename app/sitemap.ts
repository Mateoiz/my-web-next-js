import { MetadataRoute } from 'next'
 
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://www.jpcsdlsau.dev', // Replace with your actual live domain
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1.0, // Tells Google this is the most important page
    },
    {
      url: 'https://www.jpcsdlsau.dev/workspace',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    // Add your blog or other main routes here
  ]
}