import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

import { CONFIG } from 'src/global-config';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

// export function GoogleReviewsWelcome({ team, businessProfile, stats, sx, ...other }) {
//   const theme = useTheme();

//   return (
//     <Box
//       sx={[
//         (theme) => ({
//           ...theme.mixins.bgGradient({
//             images: [
//               `linear-gradient(to right, ${theme.vars.palette.grey[900]} 25%, ${varAlpha(theme.vars.palette.primary.darkerChannel, 0.88)})`,
//               `url(${CONFIG.assetsDir}/assets/background/background-6.webp)`,
//             ],
//           }),
//           pt: 5,
//           pb: 5,
//           pr: 3,
//           gap: 5,
//           borderRadius: 2,
//           display: 'flex',
//           height: { md: 1 },
//           position: 'relative',
//           pl: { xs: 3, md: 5 },
//           alignItems: 'center',
//           color: 'common.white',
//           textAlign: { xs: 'center', md: 'left' },
//           flexDirection: { xs: 'column', md: 'row' },
//           border: `solid 1px ${theme.vars.palette.grey[800]}`,
//         }),
//         ...(Array.isArray(sx) ? sx : [sx]),
//       ]}
//       {...other}
//     >
//       <Box
//         sx={{
//           display: 'flex',
//           flex: '1 1 auto',
//           flexDirection: 'column',
//           alignItems: { xs: 'center', md: 'flex-start' },
//         }}
//       >
//         <Stack spacing={2} sx={{ mb: 3 }}>
//           <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
//             <Box
//               sx={{
//                 width: 56,
//                 height: 56,
//                 borderRadius: 2,
//                 bgcolor: 'white',
//                 display: 'flex',
//                 alignItems: 'center',
//                 justifyContent: 'center',
//                 boxShadow: 2,
//               }}
//             >
//               <Iconify icon="logos:google" width={28} height={28} />
//             </Box>
            
//             <Box>
//               <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 0.5 }}>
//                 Google Reviews
//               </Typography>
//               <Typography variant="body2" sx={{ opacity: 0.8 }}>
//                 {businessProfile?.businessName || 'Business Profile'}
//               </Typography>
//             </Box>
//           </Box>
//         </Stack>

//         <Typography variant="h6" sx={{ whiteSpace: 'pre-line', mb: 2 }}>
//           Manage and analyze your Google Reviews
//         </Typography>

//         <Typography variant="body2" sx={{ opacity: 0.64, maxWidth: 360, mb: 3 }}>
//           Track customer feedback, respond to reviews, and monitor your business reputation across Google platforms.
//         </Typography>

//         <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', gap: 2 }}>
//           <Button
//             variant="contained"
//             color="primary"
//             startIcon={<Iconify icon="eva:refresh-fill" />}
//           >
//             Sync Reviews
//           </Button>
          
//           <Button
//             variant="outlined"
//             sx={{ 
//               color: 'white', 
//               borderColor: 'white',
//               '&:hover': { 
//                 borderColor: 'white',
//                 bgcolor: alpha(theme.palette.common.white, 0.1)
//               }
//             }}
//             startIcon={<Iconify icon="eva:settings-fill" />}
//           >
//             Settings
//           </Button>
//         </Stack>
//       </Box>

//       {/* Stats Summary */}
      
//     </Box>
//   );
// }

export function GoogleReviewsWelcome({ team, businessProfile, stats, sx, ...other  }) {
  const theme = useTheme();

  return (
    <Box
      sx={[
        (theme) => ({
          ...theme.mixins.bgGradient({
            images: [
              `linear-gradient(to right, ${theme.vars.palette.background.default} 25%, ${varAlpha(theme.vars.palette.primary.darkerChannel, 0.88)})`,
              `url(${CONFIG.assetsDir}/assets/background/background-6.webp)`,
            ],
          }),
          pt: 5,
          pb: 5,
          pr: 3,
          gap: 5,
          borderRadius: 2,
          display: 'flex',
          height: { md: 1 },
          position: 'relative',
          pl: { xs: 3, md: 5 },
          alignItems: 'center',
          color: 'common.white',
          textAlign: { xs: 'center', md: 'left' },
          flexDirection: { xs: 'column', md: 'row' },
          border: `solid 1px ${theme.vars.palette.background.default}`,
        }),
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...other}
    >
      <Box
        sx={{
          display: 'flex',
          flex: '1 1 auto',
          flexDirection: 'column',
          alignItems: { xs: 'center', md: 'flex-start' },
        }}
      >
        <Stack spacing={2} sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Iconify icon="socials:google" width={72} height={72} />
            
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 0.5 }} color="text.primary">
                {/* Google Overview */}
                {businessProfile.displayName || 'Business Profile'}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.8 }} color="text.secondary">
                Business Profile
              </Typography>
            </Box>
          </Box>
        </Stack>

        <Typography variant="h6" sx={{ whiteSpace: 'pre-line', mb: 2 }} color="text.primary">
          Have a look at your Google Business Profile
        </Typography>

        <Typography variant="body2" sx={{ opacity: 0.64, maxWidth: 360, mb: 3 }} color="text.secondary">
        Get a quick overview of your Google reviews, ratings, and customer feedback. Track your business reputation and see how customers are engaging with your profile.
        </Typography>
      </Box>

      {/* Stats Summary */}
      <Box sx={{ maxWidth: 300, width: '100%' }}>
        <Stack spacing={2}>
          <Box sx={{ textAlign: 'center', p: 2, bgcolor: alpha(theme.palette.common.white, 0.1), borderRadius: 2 }}>
            <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 1 }}>
              {stats?.total || 0}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.8 }}>
              Total Reviews
            </Typography>
          </Box>
          
          <Box sx={{ textAlign: 'center', p: 2, bgcolor: alpha(theme.palette.common.white, 0.1), borderRadius: 2 }}>
            <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
              {stats?.averageRating?.toFixed(1) || '0.0'}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.8 }}>
              Average Rating
            </Typography>
          </Box>
          
          <Box sx={{ textAlign: 'center', p: 2, bgcolor: alpha(theme.palette.common.white, 0.1), borderRadius: 2 }}>
            <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
              {stats?.unread || 0}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.8 }}>
              Unread Reviews
            </Typography>
          </Box>
        </Stack>
      </Box>
    </Box>
  );
}
