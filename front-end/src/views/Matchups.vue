<template lang="pug">
  .matchups
    .matchups__inner
      h2.page-title
        .page-title__sub Schedule
        .page-title__main Matchups
      .matchups-page
        .league-matchups(v-if="weeks")
          ul.weeks
            li.week(v-for="week in weeks")
              h3.title Week {{ week._id }}
              matchup-previews(:matchups="week.matchups" :expanded="true")
</template>

<script>
import axios from 'axios'
import MatchupPreviews from '@/components/MatchupPreviews.vue'

export default {
  name: 'Matchups',
  components: {
    MatchupPreviews
  },
  data() {
    return {
      weeks: []
    }
  },
  async mounted() {
    const result = await axios.get('http://localhost:4444/matchups/')
    this.weeks = result.data
  }
}
</script>

<style lang="scss">
.matchups {
}
.matchups__inner {
}
.matchups-page .week {
  margin-bottom: 5rem;
}
</style>
